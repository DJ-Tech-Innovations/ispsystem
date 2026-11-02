<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Customers\GeoTagging;
use App\Domain\Installations\InstallationService;
use App\Enums\InstallationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\GeoTagRequest;
use App\Models\InstallationJob;
use App\Models\Subscription;
use App\Models\User;
use App\Support\Search;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InstallationController extends Controller
{
    public function __construct(private InstallationService $service) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('installations/index', [
            'jobs' => InstallationJob::query()->visibleTo($user)
                ->with(['customer:id,reference,first_name,last_name,organization_name,mobile', 'technician:id,name'])
                ->when($request->query('search'), function ($q, $term) {
                    $like = '%'.addcslashes($term, '%_\\').'%';
                    $q->where(fn ($w) => $w->whereAny(['reference', 'address'], Search::like(), $like)
                        ->orWhereHas('customer', fn ($c) => $c->whereAny(['first_name', 'last_name', 'organization_name'], Search::like(), $like)));
                })
                ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
                ->when($request->query('technician'), fn ($q, $id) => $q->where('technician_id', $id))
                ->orderByRaw("case when status in ('completed','cancelled') then 1 else 0 end")->orderBy('preferred_at')
                ->paginate($request->integer('per_page', 25))->withQueryString(),
            'filters' => $request->only('search', 'status', 'technician'),
            'technicians' => $this->technicians(),
            'awaiting' => $user->can('installations.create')
                ? Subscription::query()->with('customer:id,first_name,last_name,organization_name')->whereIn('status', ['pending', 'for_installation'])
                    ->whereDoesntHave('installationJobs', fn ($q) => $q->where('status', '<>', 'cancelled'))->limit(100)->get(['id', 'reference', 'customer_id', 'service_address'])
                : [],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $job = $this->service->create($request->validate([
            'subscription_id' => ['required', 'uuid', 'exists:subscriptions,id'],
            'address' => ['nullable', 'string', 'max:255'],
            ...$this->scheduleRules(),
        ]));

        return to_route('installations.show', $job)->with('success', 'Installation job created');
    }

    public function show(Request $request, InstallationJob $installation): Response
    {
        abort_unless($installation->isVisibleTo($request->user()), 403);
        $installation->load(['customer:id,reference,first_name,last_name,organization_name,mobile,landmark,latitude,longitude,geo_source,geo_accuracy,geo_stale,geo_tagged_at', 'subscription:id,reference,status,service_plan_id', 'subscription.plan:id,name', 'technician:id,name', 'confirmer:id,name', 'updates.user:id,name']);

        return Inertia::render('installations/show', ['job' => $installation, 'technicians' => $this->technicians()]);
    }

    public function update(Request $request, InstallationJob $installation): RedirectResponse
    {
        $this->service->schedule($installation, $request->validate(['address' => ['required', 'string', 'max:255'], ...$this->scheduleRules()]));

        return back()->with('success', 'Job updated');
    }

    public function progress(Request $request, InstallationJob $installation): RedirectResponse
    {
        abort_unless($installation->isVisibleTo($request->user()), 403);
        $data = $request->validate([
            'status' => ['required', Rule::enum(InstallationStatus::class)],
            'remarks' => [Rule::requiredIf($request->input('status') === 'completed'), 'nullable', 'string', 'max:2000'],
        ]);
        $this->service->updateProgress($installation, InstallationStatus::from($data['status']), $data['remarks'] ?? null);

        return back()->with('success', 'Progress updated');
    }

    /** A technician standing at the address is the best source of a pin. */
    public function location(GeoTagRequest $request, InstallationJob $installation, GeoTagging $geo): RedirectResponse
    {
        abort_unless($installation->isVisibleTo($request->user()), 403);
        $geo->set($installation->customer, $request->validated());

        return back()->with('success', 'Location saved');
    }

    public function confirm(InstallationJob $installation): RedirectResponse
    {
        $this->service->confirm($installation);

        return back()->with('success', 'Completion confirmed. The subscription can now be activated.');
    }

    public function attachment(Request $request, InstallationJob $installation): RedirectResponse
    {
        abort_unless($installation->isVisibleTo($request->user()), 403);
        $file = $request->validate(['file' => ['required', 'file', 'max:5120', 'mimes:jpg,jpeg,png,webp,pdf']])['file'];
        $installation->update(['attachment_path' => $file->store("installations/{$installation->id}", config('isp.attachments_disk')), 'attachment_name' => $file->getClientOriginalName()]);

        return back()->with('success', 'Attachment uploaded');
    }

    public function download(Request $request, InstallationJob $installation): StreamedResponse
    {
        abort_unless($installation->isVisibleTo($request->user()) && $installation->attachment_path, 404);

        return Storage::disk(config('isp.attachments_disk'))->download($installation->attachment_path, $installation->attachment_name);
    }

    private function scheduleRules(): array
    {
        return [
            'preferred_at' => ['nullable', 'date'],
            'technician_id' => ['nullable', 'uuid', Rule::exists('users', 'id')->where('type', 'staff')],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    private function technicians()
    {
        return User::query()->staff()->where('is_active', true)->role('technician')->orderBy('name')->get(['id', 'name']);
    }
}
