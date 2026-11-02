<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AnnouncementController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('announcements/index', [
            'announcements' => Announcement::query()->with('author:id,name')->latest()->paginate($request->integer('per_page', 25))->withQueryString(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Announcement::query()->create([...$this->validated($request), 'created_by' => $request->user()->id]);

        return back()->with('success', 'Announcement saved');
    }

    public function update(Request $request, Announcement $announcement): RedirectResponse
    {
        $announcement->update($this->validated($request));

        return back()->with('success', 'Announcement updated');
    }

    public function destroy(Announcement $announcement): RedirectResponse
    {
        $announcement->delete();

        return back()->with('success', 'Announcement deleted');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:5000'],
            'audience' => ['required', 'in:all,website,customers'],
            'is_published' => ['boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);
    }
}
