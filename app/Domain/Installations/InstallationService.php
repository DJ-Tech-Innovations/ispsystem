<?php

namespace App\Domain\Installations;

use App\Domain\Customers\CustomerLifecycle;
use App\Domain\Notifications\NotificationDispatcher;
use App\Enums\InstallationStatus;
use App\Enums\NotificationEvent;
use App\Enums\SubscriptionStatus;
use App\Models\InstallationJob;
use App\Models\Subscription;
use App\Support\Audit;
use App\Support\ReferenceNumber;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InstallationService
{
    public function __construct(private CustomerLifecycle $lifecycle, private NotificationDispatcher $notifications) {}

    public function create(array $data): InstallationJob
    {
        return DB::transaction(function () use ($data) {
            $subscription = Subscription::query()->with('customer')->findOrFail($data['subscription_id']);
            $status = match (true) {
                filled($data['technician_id'] ?? null) => InstallationStatus::Assigned,
                filled($data['preferred_at'] ?? null) => InstallationStatus::Scheduled,
                default => InstallationStatus::Pending,
            };

            $job = InstallationJob::query()->create([
                'reference' => ReferenceNumber::next('INS'),
                'customer_id' => $subscription->customer_id,
                'subscription_id' => $subscription->id,
                'address' => $data['address'] ?? $subscription->service_address,
                'preferred_at' => $data['preferred_at'] ?? null,
                'technician_id' => $data['technician_id'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => $status,
                'created_by' => auth()->id(),
            ]);
            $job->updates()->create(['new_status' => $status, 'user_id' => auth()->id(), 'created_at' => now()]);

            // Creating an appointment never activates service: it only moves the subscription along.
            if ($subscription->status === SubscriptionStatus::Pending) {
                $subscription->update(['status' => SubscriptionStatus::ForInstallation]);
                $subscription->histories()->create([
                    'type' => 'status', 'old_value' => 'pending', 'new_value' => 'for_installation',
                    'reason' => "Installation {$job->reference} created", 'changed_by' => auth()->id(), 'created_at' => now(),
                ]);
                $this->lifecycle->syncFromSubscriptions($subscription->customer);
            }

            if ($job->preferred_at) {
                $this->notifySchedule($job, NotificationEvent::InstallationScheduled);
            }

            return $job;
        });
    }

    /** Scheduling details. A changed date on a booked job counts as a reschedule and tells the customer. */
    public function schedule(InstallationJob $job, array $data): void
    {
        DB::transaction(function () use ($job, $data) {
            $wasScheduled = $job->preferred_at !== null;
            $job->fill($data);
            $dateChanged = $job->isDirty('preferred_at') && $job->preferred_at !== null;
            $old = $job->status;

            if (! $old->isFinal() && $dateChanged && $wasScheduled) {
                $job->status = $job->technician_id ? InstallationStatus::Assigned : InstallationStatus::Scheduled;
            } elseif (in_array($old, [InstallationStatus::Pending, InstallationStatus::Scheduled, InstallationStatus::Rescheduled], true)) {
                $job->status = match (true) {
                    (bool) $job->technician_id => InstallationStatus::Assigned,
                    (bool) $job->preferred_at => InstallationStatus::Scheduled,
                    default => $old,
                };
            }
            $job->save();

            if ($job->status !== $old || $dateChanged) {
                $job->updates()->create([
                    'old_status' => $old, 'new_status' => $job->status, 'user_id' => auth()->id(), 'created_at' => now(),
                    'remarks' => $dateChanged && $wasScheduled ? 'Rescheduled to '.$job->preferred_at->format('M j, Y g:i A') : null,
                ]);
            }

            if ($dateChanged) {
                $this->notifySchedule($job, $wasScheduled ? NotificationEvent::InstallationRescheduled : NotificationEvent::InstallationScheduled);
            }
        });
    }

    public function updateProgress(InstallationJob $job, InstallationStatus $next, ?string $remarks): void
    {
        if (! $job->status->canTransitionTo($next)) {
            throw ValidationException::withMessages(['status' => "A {$job->status->label()} job can't become {$next->label()}."]);
        }

        DB::transaction(function () use ($job, $next, $remarks) {
            $old = $job->status;
            $job->status = $next;
            if ($next === InstallationStatus::Completed) {
                $job->completed_at = now();
                $job->completion_remarks = $remarks;
            }
            $job->save();
            $job->updates()->create(['old_status' => $old, 'new_status' => $next, 'remarks' => $remarks, 'user_id' => auth()->id(), 'created_at' => now()]);
        });
    }

    public function confirm(InstallationJob $job): void
    {
        if ($job->status !== InstallationStatus::Completed || $job->confirmed_at) {
            throw ValidationException::withMessages(['status' => 'Only a completed, unconfirmed job can be confirmed.']);
        }

        $job->update(['confirmed_at' => now(), 'confirmed_by' => auth()->id()]);
        Audit::log('installation', 'confirmed', "Installation {$job->reference} completion confirmed", $job);
    }

    private function notifySchedule(InstallationJob $job, NotificationEvent $event): void
    {
        $this->notifications->send($event, $job->customer, [
            'installation_reference' => $job->reference,
            'schedule' => $job->preferred_at->format('F j, Y g:i A'),
            'address' => $job->address,
        ]);
    }
}
