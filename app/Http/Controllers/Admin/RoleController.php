<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\Audit;
use App\Support\PermissionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('roles/index', [
            'roles' => Role::query()->with('permissions:id,name')->withCount('users')->orderBy('name')->get()->map(fn (Role $role) => [
                'id' => $role->id, 'name' => $role->name, 'label' => PermissionCatalog::roleLabel($role->name),
                'locked' => $role->name === PermissionCatalog::OWNER, 'users_count' => $role->users_count,
                'permissions' => $role->permissions->pluck('name'),
            ]),
            'catalog' => PermissionCatalog::groups(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:50', 'regex:/^[a-zA-Z ]+$/'], 'permissions' => ['array'], 'permissions.*' => [Rule::in(PermissionCatalog::all())]]);
        $name = str($data['name'])->lower()->snake()->toString();
        abort_if(Role::query()->where('name', $name)->exists(), 422, 'That role already exists.');
        Role::create(['name' => $name, 'guard_name' => 'web'])->syncPermissions($data['permissions'] ?? []);
        Audit::log('role', 'created', "Role {$name} created");

        return back()->with('success', 'Role created');
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        abort_if($role->name === PermissionCatalog::OWNER, 403, 'The owner role always has every permission.');
        $data = $request->validate(['permissions' => ['array'], 'permissions.*' => [Rule::in(PermissionCatalog::all())]]);
        $before = $role->permissions()->pluck('name')->all();
        $role->syncPermissions($data['permissions'] ?? []);
        Audit::log('role', 'updated', "Permissions changed on role {$role->name}", null, [
            'granted' => array_values(array_diff($data['permissions'] ?? [], $before)),
            'revoked' => array_values(array_diff($before, $data['permissions'] ?? [])),
        ]);

        return back()->with('success', 'Role permissions saved');
    }

    public function destroy(Role $role): RedirectResponse
    {
        abort_if(array_key_exists($role->name, PermissionCatalog::defaultRoles()) || $role->name === PermissionCatalog::OWNER, 403, 'Built-in roles can\'t be deleted.');
        if ($role->users()->exists()) {
            return back()->with('error', 'Move this role\'s users to another role first.');
        }
        Audit::log('role', 'deleted', "Role {$role->name} deleted");
        $role->delete();

        return back()->with('success', 'Role deleted');
    }
}
