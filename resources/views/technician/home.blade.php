<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Dashboard') }}
        </h2>
    </x-slot>

    <div class="py-6">
        <div class="mx-auto max-w-xl px-4 space-y-4">

            @if ($errors->any())
                <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    @foreach ($errors->all() as $error)
                        <p>{{ $error }}</p>
                    @endforeach
                </div>
            @endif

            @if (session('status'))
                <div class="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    {{ session('status') }}
                </div>
            @endif

            @if ($pendingWorkOrders->isNotEmpty())
                {{-- Shown above the scan prompt on purpose: if there's work
                     waiting, that's what a technician needs to act on first,
                     before whatever unit they happened to walk up to. --}}
                <div>
                    <h3 class="mb-2 text-sm font-medium text-gray-700">
                        {{ __('Jobs Waiting to be Claimed') }}
                    </h3>
                    <ul class="space-y-3">
                        @foreach ($pendingWorkOrders as $workOrder)
                            <li class="rounded-xl border border-gray-200 bg-white p-4">
                                <p class="font-mono text-base font-semibold text-gray-900">
                                    {{ $workOrder->airConditioner->ac_code }}
                                </p>
                                <p class="text-sm text-gray-500">
                                    {{ $workOrder->airConditioner->room->building->name }} / {{ $workOrder->airConditioner->room->name }}
                                </p>
                                <p class="mt-1 text-xs text-amber-700">
                                    {{-- Carbon 3's diffInDays() returns a float now (a behavior
                                         change from Carbon 2) — cast to int for a whole-day count. --}}
                                    {{ __('Waiting :days days', ['days' => (int) $workOrder->created_at->diffInDays(now())]) }}
                                </p>

                                <form method="POST" action="{{ route('tech.work-orders.claim', $workOrder) }}" class="mt-3">
                                    @csrf
                                    <button type="submit"
                                        class="w-full rounded-lg bg-blue-600 py-3 text-base font-semibold text-white active:bg-blue-700">
                                        {{ __('Claim This Job') }}
                                    </button>
                                </form>
                            </li>
                        @endforeach
                    </ul>
                </div>
            @else
                <p class="text-center text-gray-600">
                    {{ __('Scan the QR code on an air conditioner to view its details and log maintenance work.') }}
                </p>
            @endif
        </div>
    </div>
</x-app-layout>
