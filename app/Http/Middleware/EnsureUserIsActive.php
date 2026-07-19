<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    /**
     * Defense in depth: LoginRequest already blocks a pending/suspended
     * user from ever getting a session, but an org_admin can suspend
     * someone mid-session — this catches that on the very next request
     * instead of waiting for the session to naturally expire.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->isActive()) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->withErrors([
                'email' => $user->status === 'suspended'
                    ? trans('auth.suspended')
                    : trans('auth.pending'),
            ]);
        }

        return $next($request);
    }
}
