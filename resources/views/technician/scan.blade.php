<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Air Conditioner') }}
        </h2>
    </x-slot>

    {{-- Single column, generous touch targets — this is read one-handed
         standing next to the unit, not at a desk. --}}
    <div class="py-6">
        <div class="mx-auto max-w-xl px-4 space-y-4">

            @if (session('status'))
                <div class="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    {{ session('status') }}
                </div>
            @endif

            {{-- Unit spec card --}}
            <div class="rounded-xl border border-gray-200 bg-white p-4">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <p class="font-mono text-lg font-semibold text-gray-900">{{ $airConditioner->ac_code }}</p>
                        <p class="text-sm text-gray-500">
                            {{ $airConditioner->room->building->name }} / {{ $airConditioner->room->name }}
                        </p>
                    </div>
                    @include('admin.air-conditioners._status-badge', ['status' => $airConditioner->status])
                </div>

                <dl class="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                    <dt class="text-gray-500">{{ __('Brand') }}</dt>
                    <dd class="text-gray-900">{{ $airConditioner->brand }}</dd>

                    <dt class="text-gray-500">{{ __('Model') }}</dt>
                    <dd class="text-gray-900">{{ $airConditioner->model ?? '-' }}</dd>

                    <dt class="text-gray-500">{{ __('BTU') }}</dt>
                    <dd class="text-gray-900">{{ $airConditioner->btu ?? '-' }}</dd>

                    <dt class="text-gray-500">{{ __('Installed') }}</dt>
                    <dd class="text-gray-900">{{ optional($airConditioner->installed_at)->format('d M Y') ?? '-' }}</dd>
                </dl>
            </div>

            {{-- Primary action: big, thumb-reachable, first thing after the
                 spec card — a technician's next move after reading the
                 unit's status is almost always to log work on it. --}}
            <a href="{{ route('tech.maintenance-logs.create', $airConditioner->qr_code) }}"
               class="flex w-full items-center justify-center rounded-lg bg-blue-600 py-4 text-base font-semibold text-white active:bg-blue-700">
                {{ __('Log Maintenance Work') }}
            </a>

            {{-- History --}}
            <div>
                <h3 class="mb-2 text-sm font-medium text-gray-700">{{ __('Maintenance History') }}</h3>

                @if ($airConditioner->maintenanceLogs->isEmpty())
                    <p class="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
                        {{ __('No maintenance history yet.') }}
                    </p>
                @else
                    <ul class="space-y-2">
                        @foreach ($airConditioner->maintenanceLogs as $log)
                            @php
                                $actionLabels = [
                                    'cleaning' => __('Cleaning'),
                                    'repair' => __('Repair'),
                                    'refill_refrigerant' => __('Refill Refrigerant'),
                                ];
                            @endphp
                            <li class="rounded-lg border border-gray-200 bg-white p-3">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm font-semibold text-gray-900">
                                        {{ $actionLabels[$log->action] ?? $log->action }}
                                    </span>
                                    <time class="text-xs text-gray-500" datetime="{{ $log->performed_at->toIso8601String() }}">
                                        {{ $log->performed_at->format('d M Y H:i') }}
                                    </time>
                                </div>
                                <p class="mt-1 text-xs text-gray-500">{{ __('By') }} {{ $log->technician->name }}</p>
                                @if ($log->notes)
                                    <p class="mt-2 text-sm text-gray-700">{{ $log->notes }}</p>
                                @endif
                            </li>
                        @endforeach
                    </ul>
                @endif
            </div>
        </div>
    </div>
</x-app-layout>
