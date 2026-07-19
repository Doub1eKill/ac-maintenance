<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Dashboard') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">

            {{-- maintenance-logs.* routes live under role:org_admin only
                 (same reasoning as buildings/rooms/air-conditioners — see
                 routes/web.php), so this link would 403 for super_admin. --}}
            @if (auth()->user()->isOrgAdmin())
                <div class="flex justify-end">
                    <a href="{{ route('admin.maintenance-logs.index') }}" class="text-sm text-blue-600 hover:underline">
                        {{ __('View all maintenance history') }} &rarr;
                    </a>
                </div>
            @endif

            {{-- University selector — super_admin only. GET + onchange
                 submit (no AJAX) keeps this a plain, bookmarkable/shareable
                 URL (?university_id=X) rather than client-side state that
                 disappears on refresh. --}}
            @if ($universities !== null)
                <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg p-4">
                    <form method="GET" action="{{ route('dashboard') }}" class="flex items-center gap-3">
                        <label for="university_id" class="text-sm font-medium text-gray-700">
                            {{ __('Viewing') }}
                        </label>
                        <select id="university_id" name="university_id" onchange="this.form.submit()"
                            class="block w-64 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm">
                            <option value="" @selected($selectedUniversity === null)>{{ __('All institutions (overview)') }}</option>
                            @foreach ($universities as $university)
                                <option value="{{ $university->id }}" @selected($selectedUniversity?->id === $university->id)>
                                    {{ $university->name }}
                                </option>
                            @endforeach
                        </select>
                    </form>
                </div>
            @endif

            @if ($selectedUniversity !== null)
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-medium text-gray-900">{{ $selectedUniversity->name }}</h3>
                    <a href="{{ route('dashboard') }}" class="text-sm text-blue-600 hover:underline">
                        {{ __('Back to overview') }}
                    </a>
                </div>
            @endif

            {{-- Stat cards: all 4 numbers visible without scrolling, which is
                 the whole point of an overview dashboard. --}}
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div class="rounded-xl border border-gray-200 bg-white p-4">
                    <p class="text-sm text-gray-500">{{ __('Total Units') }}</p>
                    <p class="mt-1 text-3xl font-semibold text-gray-900">{{ $stats['total'] }}</p>
                </div>
                <div class="rounded-xl border border-green-200 bg-green-50 p-4">
                    <p class="text-sm text-green-600">{{ __('Normal') }}</p>
                    <p class="mt-1 text-3xl font-semibold text-green-700">{{ $stats['normal'] }}</p>
                </div>
                <div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p class="text-sm text-amber-600">{{ __('Needs Cleaning') }}</p>
                    <p class="mt-1 text-3xl font-semibold text-amber-700">{{ $stats['needs_cleaning'] }}</p>
                </div>
                <div class="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p class="text-sm text-red-600">{{ __('Broken') }}</p>
                    <p class="mt-1 text-3xl font-semibold text-red-700">{{ $stats['broken'] }}</p>
                </div>
            </div>

            {{-- Per-institution breakdown — only shown on the combined
                 overview, since a single institution's own 4 stat cards
                 above already say everything this table would repeat. --}}
            @if ($breakdown !== null)
                <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                    <h3 class="mb-4 text-lg font-medium text-gray-900">{{ __('By Institution') }}</h3>
                    <div class="overflow-x-auto rounded-lg border border-gray-200">
                        <table class="min-w-full divide-y divide-gray-200 text-sm">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('Institution') }}</th>
                                    <th scope="col" class="px-4 py-3 text-right font-medium text-gray-600">{{ __('Total') }}</th>
                                    <th scope="col" class="px-4 py-3 text-right font-medium text-gray-600">{{ __('Normal') }}</th>
                                    <th scope="col" class="px-4 py-3 text-right font-medium text-gray-600">{{ __('Needs Cleaning') }}</th>
                                    <th scope="col" class="px-4 py-3 text-right font-medium text-gray-600">{{ __('Broken') }}</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                @forelse ($breakdown as $row)
                                    <tr>
                                        <td class="px-4 py-3 font-medium text-gray-900">
                                            <a href="{{ route('dashboard', ['university_id' => $row['university']->id]) }}"
                                               class="hover:underline">
                                                {{ $row['university']->name }}
                                            </a>
                                        </td>
                                        <td class="px-4 py-3 text-right text-gray-600">{{ $row['stats']['total'] }}</td>
                                        <td class="px-4 py-3 text-right text-gray-600">{{ $row['stats']['normal'] }}</td>
                                        <td class="px-4 py-3 text-right text-gray-600">{{ $row['stats']['needs_cleaning'] }}</td>
                                        <td class="px-4 py-3 text-right text-gray-600">{{ $row['stats']['broken'] }}</td>
                                    </tr>
                                @empty
                                    <tr>
                                        <td colspan="5" class="px-4 py-6 text-center text-gray-500">
                                            {{ __('No institutions yet.') }}
                                        </td>
                                    </tr>
                                @endforelse
                            </tbody>
                        </table>
                    </div>
                </div>
            @endif

            {{-- Null only when super_admin is on the combined overview — a
                 flat per-unit list mixing every institution's equipment
                 together isn't something anyone could act on, so it's
                 skipped entirely rather than shown empty. --}}
            @if ($lastCleanedList !== null)
                <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                    <h3 class="mb-4 text-lg font-medium text-gray-900">{{ __('Units by Last Cleaned') }}</h3>

                    {{-- max-h + overflow-y-auto: this list is every unit in
                         the institution, easily hundreds of rows — a scroll
                         box keeps the dashboard itself a fixed, predictable
                         height instead of growing with the data. --}}
                    <div class="max-h-96 overflow-y-auto overflow-x-auto rounded-lg border border-gray-200">
                        <table class="min-w-full divide-y divide-gray-200 text-sm">
                            <thead class="sticky top-0 bg-gray-50">
                                <tr>
                                    <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('AC Code') }}</th>
                                    <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('Location') }}</th>
                                    <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('Status') }}</th>
                                    <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('Last Cleaned') }}</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                @forelse ($lastCleanedList as $ac)
                                    {{-- Highlighted, not hidden: this row already has an automatic
                                         work order out for it — the admin doesn't need to do
                                         anything, just know it's already being handled. --}}
                                    <tr class="{{ $ac->open_work_orders_count > 0 ? 'bg-amber-50' : '' }}">
                                        <td class="px-4 py-3 font-mono font-medium text-gray-900">
                                            {{ $ac->ac_code }}
                                            @if ($ac->open_work_orders_count > 0)
                                                <span class="ml-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                                    {{ __('Job in progress') }}
                                                </span>
                                            @endif
                                        </td>
                                        <td class="px-4 py-3 text-gray-600">
                                            {{ $ac->room->building->name }} / {{ $ac->room->name }}
                                        </td>
                                        <td class="px-4 py-3">
                                            @include('admin.air-conditioners._status-badge', ['status' => $ac->status])
                                        </td>
                                        <td class="px-4 py-3 text-gray-600">
                                            @if ($ac->last_cleaned_at)
                                                {{ \Illuminate\Support\Carbon::parse($ac->last_cleaned_at)->format('d M Y') }}
                                            @else
                                                {{ __('Never cleaned (registered :date)', ['date' => $ac->created_at->format('d M Y')]) }}
                                            @endif
                                        </td>
                                    </tr>
                                @empty
                                    <tr>
                                        <td colspan="4" class="px-4 py-6 text-center text-gray-500">
                                            {{ __('No air conditioners registered yet.') }}
                                        </td>
                                    </tr>
                                @endforelse
                            </tbody>
                        </table>
                    </div>
                </div>
            @endif
        </div>
    </div>
</x-app-layout>
