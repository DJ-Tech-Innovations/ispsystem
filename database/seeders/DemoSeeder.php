<?php

namespace Database\Seeders;

use App\Domain\Billing\CollectionsService;
use App\Domain\Billing\GenerateInvoices;
use App\Domain\Installations\InstallationService;
use App\Domain\Payments\PaymentService;
use App\Domain\Subscriptions\SubscriptionStatusService;
use App\Domain\Tickets\TicketService;
use App\Enums\CustomerStatus;
use App\Enums\InstallationStatus;
use App\Enums\LeadStatus;
use App\Enums\SubscriptionStatus;
use App\Enums\TicketStatus;
use App\Models\Announcement;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\NotificationLog;
use App\Models\ServicePlan;
use App\Models\Subscription;
use App\Models\User;
use App\Support\ReferenceNumber;
use App\Support\Settings;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Bus;
use RuntimeException;

/** Believable sample data, built through the real services so every balance and history row is genuine. */
class DemoSeeder extends Seeder
{
    private const FIRST = ['Maria', 'Jose', 'Ana', 'Mark', 'Liza', 'Paolo', 'Grace', 'Ramon', 'Carla', 'Miguel', 'Joy', 'Rico', 'Nina', 'Dante', 'Ella', 'Noel', 'Tess', 'Arnel', 'Bea', 'Gino', 'Rhea', 'Allan', 'Ivy', 'Leo', 'Mae', 'Oscar', 'Pia', 'Ryan', 'Sheila', 'Vince'];

    private const LAST = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Castillo', 'Flores', 'Ramos', 'Villanueva', 'Aquino', 'Navarro', 'Salazar', 'Mercado', 'Dela Rosa', 'Pascual', 'Fernandez', 'Lim'];

    private const STREETS = ['Rizal St.', 'Mabini Ave.', 'Bonifacio St.', 'Luna St.', 'Quezon Blvd.', 'Del Pilar St.', 'Burgos St.', 'Sampaguita Rd.'];

    private const BARANGAYS = ['Brgy. San Isidro', 'Brgy. Poblacion', 'Brgy. Santo Niño', 'Brgy. Mabuhay', 'Brgy. San Roque', 'Brgy. Bagong Silang'];

    public function run(): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('DemoSeeder must not run in production.');
        }

        Bus::fake(); // no demo emails
        mt_srand(2026);

        $staff = $this->staff();
        Auth::login($staff['owner']);
        $plans = $this->plans();
        $this->customers($plans, $staff);
        $this->leads($plans, $staff);
        $this->announcements($staff['owner']);
        $this->call([DemoPortalSeeder::class, GconnBrandSeeder::class, DemoGeoSeeder::class]);
        // Jobs were faked above, so these were never really delivered; don't leave them looking stuck.
        NotificationLog::query()->update(['status' => 'sent', 'sent_at' => now()]);
        Auth::logout();
        Settings::flush();
    }

    private function staff(): array
    {
        $make = fn (string $name, string $email, string $role) => tap(
            User::query()->create(['name' => $name, 'email' => $email, 'password' => 'password']),
            fn (User $user) => $user->syncRoles($role),
        );

        return [
            'owner' => $make('Darwin Ibay', 'owner@ispsystem.test', 'owner'),
            'admin' => $make('Andrea Ramos', 'admin@ispsystem.test', 'administrator'),
            'billing' => $make('Bianca Torres', 'billing@ispsystem.test', 'billing'),
            'support' => $make('Carlo Mendoza', 'support@ispsystem.test', 'customer_service'),
            'tech' => $make('Tomas Aguilar', 'tech@ispsystem.test', 'technician'),
            'tech2' => $make('Rey Dizon', 'tech2@ispsystem.test', 'technician'),
        ];
    }

    private function plans(): array
    {
        $rows = [
            ['Home Basic', 'HOME-25', 'Everyday browsing and streaming for small households.', 'Up to 25 Mbps', 999, 1500],
            ['Home Plus', 'HOME-50', 'Reliable speeds for work-from-home families.', 'Up to 50 Mbps', 1299, 1500],
            ['Home Max', 'HOME-100', 'Gaming and 4K streaming on many devices.', 'Up to 100 Mbps', 1699, 1000],
            ['Business Pro', 'BIZ-200', 'Priority support for small businesses.', 'Up to 200 Mbps', 3499, 2500],
        ];

        return array_map(fn ($row, $index) => ServicePlan::query()->create([
            'name' => $row[0], 'code' => $row[1], 'description' => $row[2], 'speed_description' => $row[3],
            'monthly_price' => $row[4], 'installation_fee' => $row[5], 'sort_order' => $index,
        ]), $rows, array_keys($rows));
    }

    private function customers(array $plans, array $staff): void
    {
        $subscriptions = app(SubscriptionStatusService::class);
        $installations = app(InstallationService::class);
        $tickets = app(TicketService::class);
        $payments = app(PaymentService::class);
        $billing = app(GenerateInvoices::class);

        $active = [];
        for ($i = 0; $i < 42; $i++) {
            $first = self::FIRST[$i % 30];
            $last = self::LAST[($i * 7) % 20];
            $address = mt_rand(1, 399).' '.self::STREETS[$i % 8].', '.self::BARANGAYS[$i % 6].', Quezon City';
            $business = $i % 11 === 10;
            $registered = today()->subDays(mt_rand(40, 200));

            $customer = Customer::query()->create([
                'reference' => ReferenceNumber::next('CUS', yearly: false), 'type' => $business ? 'business' : 'residential',
                'first_name' => $business ? null : $first, 'last_name' => $business ? null : $last,
                'organization_name' => $business ? "$last Trading" : null,
                'email' => strtolower(str_replace(' ', '', "$first.$last$i")).'@example.com', 'mobile' => '0917'.str_pad((string) (5550000 + $i * 137), 7, '0', STR_PAD_LEFT),
                'billing_address' => $address, 'service_address' => $address,
                'status' => CustomerStatus::Registered, 'registered_on' => $registered, 'created_by' => $staff['support']->id,
            ]);
            $customer->statusHistories()->create(['new_status' => CustomerStatus::Registered, 'reason' => 'Customer registered', 'changed_by' => $staff['support']->id, 'created_at' => $registered]);
            $customer->notificationPreference()->create();
            $customer->interactions()->create(['type' => $i % 2 ? 'call' : 'visit', 'body' => $i % 2 ? 'Called to confirm the service address and preferred installation time.' : 'Walked in to the office and asked about plan options.', 'created_by' => $staff['support']->id]);

            $plan = $business ? $plans[3] : $plans[$i % 3];
            $subscription = Subscription::query()->create([
                'reference' => ReferenceNumber::next('SUB'), 'customer_id' => $customer->id, 'service_plan_id' => $plan->id,
                'service_address' => $address, 'monthly_amount' => $plan->monthly_price, 'installation_fee' => $plan->installation_fee,
                'status' => SubscriptionStatus::Pending, 'created_by' => $staff['support']->id,
            ]);
            $subscription->histories()->create(['new_value' => 'pending', 'reason' => 'Subscription created', 'changed_by' => $staff['support']->id, 'created_at' => now()]);

            if ($i >= 38) {
                continue; // brand-new customers still waiting for a job
            }

            $technician = $i % 2 ? $staff['tech'] : $staff['tech2'];
            $job = $installations->create(['subscription_id' => $subscription->id, 'preferred_at' => $i >= 32 ? now()->addDays($i - 30)->setTime(9 + $i % 6, 0) : $registered->copy()->addDays(3)->setTime(10, 0), 'technician_id' => $technician->id, 'notes' => 'Fiber drop from the nearest NAP box.']);

            if ($i >= 32) {
                if ($i >= 35) {
                    $installations->updateProgress($job, InstallationStatus::InProgress, 'Technician on site.');
                }

                continue;
            }

            $installations->updateProgress($job, InstallationStatus::InProgress, 'On site, running the fiber drop.');
            $installations->updateProgress($job->fresh(), InstallationStatus::Completed, 'Installed ONU, tested signal and speed.');
            if ($i < 30) {
                $installations->confirm($job->fresh());
                $start = today()->subMonths(mt_rand(2, 5))->startOfMonth()->addDays(mt_rand(0, 25));
                $subscriptions->transition($subscription, SubscriptionStatus::Active, 'Installation complete', $start->toDateString());
                $active[] = $subscription->fresh();
            }
        }

        // Bill history as of today, then pay most of it so aging and collections look like a real month.
        $billing->run(today());

        Invoice::query()->with('customer')->oldest('period_start')->get()->each(function (Invoice $invoice, int $index) use ($payments, $staff) {
            $age = $invoice->period_start->diffInDays(today());
            $paidAt = $invoice->period_start->copy()->addDays(mt_rand(1, 14))->setTime(10, 30);
            $paidAt = $paidAt->isFuture() ? now()->subHour() : $paidAt;
            $invoice->update(['issue_date' => $invoice->period_start, 'due_date' => $invoice->period_start->copy()->addDays(15)]);
            $invoice->recalculate();

            $method = ['cash', 'gcash', 'bank_transfer', 'maya'][$index % 4];
            $roll = mt_rand(1, 100);
            Auth::login($staff['billing']);
            if ($age > 35 || $roll <= 45) {
                if ($age > 35 ? $roll <= 92 : true) {
                    $payments->record($invoice->fresh(), ['paid_at' => $paidAt, 'amount' => $invoice->balance, 'method' => $method, 'external_reference' => $method === 'cash' ? null : 'REF'.mt_rand(100000, 999999)]);
                }
            } elseif ($roll <= 60) {
                $payments->record($invoice->fresh(), ['paid_at' => $paidAt, 'amount' => bcdiv((string) $invoice->balance, '2', 2), 'method' => $method]);
            }
            Auth::login($staff['owner']);
        });
        app(CollectionsService::class)->markOverdue();

        foreach (array_slice($active, 0, 2) as $subscription) {
            $subscriptions->transition($subscription, SubscriptionStatus::Suspended, 'Unpaid balance past the grace period');
        }

        $this->tickets($active, $staff, $tickets);
    }

    private function tickets(array $active, array $staff, TicketService $tickets): void
    {
        $samples = [
            ['no_internet', 'No internet since this morning', 'The red LOS light is blinking on the modem.', 'urgent', 'tech'],
            ['slow_internet', 'Speed drops every evening', 'Getting about 8 Mbps at around 8 PM on a 50 Mbps plan.', 'high', 'tech2'],
            ['billing', 'Please double check my last invoice', 'I think the installation fee was charged twice.', 'normal', 'support'],
            ['intermittent', 'Connection keeps dropping', 'Disconnects every 20 minutes or so since the storm.', 'high', null],
            ['plan_change', 'Want to upgrade to Home Max', 'Would like to move up for gaming. What is the process?', 'low', 'support'],
            ['account', 'Update my billing address', 'We moved to a new unit in the same building.', 'low', null],
            ['installation', 'Wire is hanging low outside', 'The drop wire is sagging near the gate after the last job.', 'normal', 'tech'],
        ];

        foreach ($samples as $index => [$category, $subject, $description, $priority, $assignee]) {
            $subscription = $active[($index * 3 + 4) % count($active)];
            $ticket = $tickets->create([
                'customer_id' => $subscription->customer_id, 'subscription_id' => $subscription->id, 'category' => $category,
                'subject' => $subject, 'description' => $description, 'priority' => $priority,
                'assigned_to' => $assignee ? $staff[$assignee]->id : null,
            ]);

            if ($index === 1) {
                $ticket->update(['due_at' => now()->subHours(3)]);
            }
            if ($index === 0 || $index === 2) {
                $tickets->changeStatus($ticket, TicketStatus::InProgress);
                $tickets->addMessage($ticket, 'Thanks for reaching out. We are checking this now and will update you shortly.', false);
                $tickets->addMessage($ticket, 'Checked the OLT port: signal looks weak on this line. Likely needs a site visit.', true);
            }
            if ($index === 6) {
                $tickets->addMessage($ticket, 'Our technician fixed the wire this morning. Please confirm it looks okay.', false);
                $tickets->changeStatus($ticket, TicketStatus::Resolved, 'Re-tensioned the drop wire and re-clamped at the pole.');
            }
        }
    }

    private function leads(array $plans, array $staff): void
    {
        $rows = [
            ['Janine Velasco', 'website', LeadStatus::New, 0], ['Ricardo Tan', 'facebook', LeadStatus::New, 1], ['Sofia Herrera', 'referral', LeadStatus::New, 0],
            ['Edgar Domingo', 'walk_in', LeadStatus::New, 2], ['Lourdes Ignacio', 'website', LeadStatus::Contacted, 1], ['Marlon Cabrera', 'phone', LeadStatus::Contacted, 2],
            ['Hazel Gomez', 'referral', LeadStatus::Qualified, 1], ['Kenneth Uy', 'facebook', LeadStatus::Qualified, 3], ['Nestor Rivera', 'website', LeadStatus::Lost, 0],
        ];

        foreach ($rows as $index => [$name, $source, $status, $plan]) {
            Lead::query()->create([
                'reference' => ReferenceNumber::next('LD'), 'name' => $name, 'source' => $source, 'status' => $status,
                'email' => strtolower(str_replace(' ', '.', $name)).'@example.com', 'mobile' => '0918'.str_pad((string) (2220000 + $index * 311), 7, '0', STR_PAD_LEFT),
                'address' => self::BARANGAYS[$index % 6].', Quezon City', 'service_plan_id' => $plans[$plan]->id,
                'assigned_to' => $status === LeadStatus::New ? null : $staff['support']->id,
                'follow_up_on' => $status === LeadStatus::Lost ? null : today()->addDays($index - 3),
                'lost_reason' => $status === LeadStatus::Lost ? 'Outside the coverage area' : null,
                'notes' => 'Asked about availability in the area.', 'created_by' => $staff['support']->id,
            ]);
        }
    }

    private function announcements(User $owner): void
    {
        Announcement::query()->create(['title' => 'Scheduled maintenance', 'body' => 'Brief service interruption this Sunday from 1 AM to 3 AM for network upgrades in Brgy. San Isidro.', 'audience' => 'customers', 'is_published' => true, 'starts_at' => now(), 'ends_at' => now()->addWeek(), 'created_by' => $owner->id]);
        Announcement::query()->create(['title' => 'Holiday office hours', 'body' => 'Our office hours will change during the holidays.', 'audience' => 'all', 'is_published' => false, 'created_by' => $owner->id]);
    }
}
