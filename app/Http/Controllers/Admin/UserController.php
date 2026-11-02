<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserRequest;
use App\Models\User;
use App\Support\Audit;
use App\Support\PermissionCatalog;
use App\Support\Search;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('users/index', [
            'users' => User::query()->staff()->with('roles:id,name')
                ->when($request->query('search'), fn ($q, $term) => $q->whereAny(['name', 'email'], Search::like(), '%'.addcslashes($term, '%_\\').'%'))
                ->when($request->query('role'), fn ($q, $role) => $q->role($role))
                ->orderBy('name')->paginate($request->integer('per_page', 25))->withQueryString()
                ->through(fn (User $u) => [...$u->only('id', 'name', 'email', 'phone', 'is_active', 'last_login_at'), 'role' => $u->roles->first()?->name]),
            'filters' => $request->only('search', 'role'),
            'roles' => Role::query()->orderBy('name')->pluck('name')->map(fn ($name) => ['value' => $name, 'label' => PermissionCatalog::roleLabel($name)]),
        ]);
    }

    public function store(UserRequest $request): RedirectResponse
    {
        $this->guardOwnerRole($request, $request->input('role'));
        $data = $request->safe()->except('role');
        $user = User::query()->create([...$data, 'email' => strtolower($data['email']), 'type' => 'staff']);
        $user->syncRoles($request->input('role'));

        return back()->with('success', 'User created');
    }

    public function update(UserRequest $request, User $user): RedirectResponse
    {
        $this->guardOwnerRole($request, $request->input('role'));
        $this->guardOwnerRole($request, $user->getRoleNames()->first());
        abort_if($user->is($request->user()) && $request->input('role') !== $user->getRoleNames()->first(), 422, 'You can\'t change your own role.');

        $data = $request->safe()->except('role', 'password');
        if ($request->filled('password')) {
            $data['password'] = $request->input('password');
            Audit::log('user', 'password_reset', "Password changed for {$user->email} by an administrator", $user);
        }
        $user->update($data);
        $user->syncRoles($request->input('role'));

        return back()->with('success', 'User updated');
    }

    public function toggle(Request $request, User $user): RedirectResponse
    {
        abort_if($user->is($request->user()), 422, 'You can\'t deactivate your own account.');
        $this->guardOwnerRole($request, $user->getRoleNames()->first());
        $user->update(['is_active' => ! $user->is_active]);

        return back()->with('success', $user->is_active ? 'User activated' : 'User deactivated');
    }

    /** Only an owner can create, change or deactivate an owner. */
    private function guardOwnerRole(Request $request, ?string $role): void
    {
        abort_if($role === PermissionCatalog::OWNER && ! $request->user()->hasRole(PermissionCatalog::OWNER), 403);
    }
}
