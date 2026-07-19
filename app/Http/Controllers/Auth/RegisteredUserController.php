<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterUserRequest;
use App\Models\University;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\View\View;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): View
    {
        return view('auth.register', [
            'universities' => University::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * Public self-registration is technician-only and always starts
     * status='pending' — the account cannot log in (see LoginRequest)
     * until an org_admin of the same university approves it.
     */
    public function store(RegisterUserRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'university_id' => $validated['university_id'],
            'role' => 'technician',
            'status' => 'pending',
        ]);

        event(new Registered($user));

        // Intentionally not logging the user in here (unlike stock Breeze):
        // status is 'pending', so an immediate login attempt would just be
        // rejected by LoginRequest anyway. Send them to login with a notice.
        return redirect()->route('login')->with(
            'status',
            __('Your account has been created and is awaiting approval from your university administrator.')
        );
    }
}
