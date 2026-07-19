<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Edit Air Conditioner') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-2xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                <form method="POST" action="{{ route('admin.air-conditioners.update', $airConditioner) }}" class="space-y-4">
                    @csrf
                    @method('PUT')

                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <x-input-label :value="__('AC Code')" />
                            <p class="mt-1 font-mono text-gray-900">{{ $airConditioner->ac_code }}</p>
                        </div>
                        <a href="{{ route('admin.air-conditioners.qr-code', $airConditioner) }}"
                           target="_blank"
                           class="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            {{ __('View / Download QR') }}
                        </a>
                    </div>

                    {{-- Room is read-only here on purpose: ac_code is derived from the
                         room's building/university/name at registration time, so moving
                         a unit to another room afterwards would make its code lie about
                         its location. Re-register the unit instead if it's physically moved. --}}
                    <div>
                        <x-input-label :value="__('Room')" />
                        <p class="mt-1 text-gray-900">
                            {{ $airConditioner->room->building->name }} / {{ $airConditioner->room->name }}
                        </p>
                    </div>

                    @include('admin.air-conditioners._fields')

                    <div class="flex items-center justify-end gap-3">
                        <a href="{{ route('admin.air-conditioners.index') }}" class="text-sm text-gray-600 hover:underline">
                            {{ __('Cancel') }}
                        </a>
                        <x-primary-button>{{ __('Save') }}</x-primary-button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</x-app-layout>
