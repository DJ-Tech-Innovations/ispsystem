<?php

namespace App\Http\Middleware;

use App\Enums\CustomerStatus;
use App\Enums\CustomerType;
use App\Enums\InstallationStatus;
use App\Enums\InteractionType;
use App\Enums\InvoiceStatus;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\PaymentMethod;
use App\Enums\SubscriptionStatus;
use App\Enums\TicketCategory;
use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use App\Models\InstallationJob;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\PlanChangeRequest;
use App\Models\Ticket;
use App\Models\User;
use App\Support\PermissionCatalog;
use App\Support\Settings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => fn () => $this->authProps($request),
            'business' => fn () => [
                'name' => Settings::get('business.name'),
                'tagline' => Settings::get('business.tagline'),
                'logo' => Settings::get('business.logo') ? Storage::disk('public')->url(Settings::get('business.logo')) : null,
                // The square icon for tight spots, falling back to the main logo.
                'mark' => ($mark = Settings::get('business.logo_mark') ?: Settings::get('business.logo')) ? Storage::disk('public')->url($mark) : null,
            ],
            'timezone' => config('app.timezone'),
            'flash' => fn () => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
            'enums' => fn () => $request->user()?->isStaff() ? self::enums() : [],
            'counts' => fn () => $request->user()?->isStaff() ? $this->sidebarCounts($request->user()) : [],
        ];
    }

    private function authProps(Request $request): ?array
    {
        // The portal always speaks for the customer, even if staff are signed in on the same browser.
        $user = $request->is('portal*') ? Auth::guard('customer')->user() : $request->user();
        if (! $user) {
            return null;
        }

        return [
            'user' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'role' => PermissionCatalog::roleLabel($user->getRoleNames()->first() ?? '')],
            'isOwner' => $user->hasRole(PermissionCatalog::OWNER),
            'permissions' => $user->hasRole(PermissionCatalog::OWNER) ? PermissionCatalog::all() : $user->getAllPermissions()->pluck('name')->all(),
        ];
    }

    private static function enums(): array
    {
        return [
            'customerStatus' => CustomerStatus::options(), 'customerType' => CustomerType::options(),
            'leadStatus' => LeadStatus::options(), 'leadSource' => LeadSource::options(),
            'interactionType' => InteractionType::options(), 'subscriptionStatus' => SubscriptionStatus::options(),
            'installationStatus' => InstallationStatus::options(), 'invoiceStatus' => InvoiceStatus::options(),
            'paymentMethod' => PaymentMethod::options(), 'ticketCategory' => TicketCategory::options(),
            'ticketPriority' => TicketPriority::options(), 'ticketStatus' => TicketStatus::options(),
        ];
    }

    /** Live numbers behind the sidebar pills. */
    private function sidebarCounts(User $user): array
    {
        return [
            'leads' => $user->can('leads.view') ? Lead::query()->where('status', LeadStatus::New)->count() : 0,
            'installations' => $user->can('installations.view')
                ? InstallationJob::query()->visibleTo($user)->whereNotIn('status', [InstallationStatus::Completed, InstallationStatus::Cancelled])->count() : 0,
            'overdue' => $user->can('invoices.view') ? Invoice::query()->where('status', InvoiceStatus::Overdue)->count() : 0,
            'planChanges' => $user->can('plan_changes.view') ? PlanChangeRequest::query()->where('status', 'pending')->count() : 0,
            'tickets' => $user->can('tickets.view') ? Ticket::query()->visibleTo($user)->active()->count() : 0,
        ];
    }
}
