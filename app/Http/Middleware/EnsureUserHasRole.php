<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Single choke point for role checks. Route groups declare which roles
     * may enter (e.g. `role:org_admin,super_admin`) instead of every
     * controller re-checking `auth()->user()->role === '...'` — one place
     * to audit, one place to fix if the role list ever changes.
     *
     * @param  string  ...$roles  allowed roles for this route, e.g. 'role:org_admin,super_admin'
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (! in_array($request->user()?->role, $roles, true)) {
            abort(403, 'You do not have permission to access this page.');
        }

        return $next($request);
    }
}
