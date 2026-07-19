<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Print QR Stickers') }}
        </h2>
    </x-slot>

    {{-- Screen-only controls: hidden entirely when printing so only the
         sticker sheet below ends up on paper. --}}
    <div class="py-12 print:hidden">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-4">
            <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                <form method="GET" action="{{ route('admin.air-conditioners.print') }}"
                      class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div class="sm:w-64">
                        <x-input-label for="building_id" :value="__('Building')" />
                        <select id="building_id" name="building_id" onchange="this.form.submit()"
                            class="block mt-1 w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm">
                            <option value="">{{ __('All buildings') }}</option>
                            @foreach ($buildings as $building)
                                <option value="{{ $building->id }}" @selected(request('building_id') == $building->id)>
                                    {{ $building->name }}
                                </option>
                            @endforeach
                        </select>
                    </div>

                    <div class="flex items-center gap-3">
                        <a href="{{ route('admin.air-conditioners.index') }}" class="text-sm text-gray-600 hover:underline">
                            {{ __('Back to list') }}
                        </a>
                        <button type="button" onclick="window.print()"
                            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                            {{ __('Print') }} ({{ $airConditioners->count() }})
                        </button>
                    </div>
                </form>

                @if ($airConditioners->isEmpty())
                    <p class="mt-6 text-sm text-gray-500">
                        {{ __('No air conditioners match this filter.') }}
                    </p>
                @else
                    <p class="mt-4 text-sm text-gray-500">
                        {{ __('Preview below — use the Print button above once it looks right.') }}
                    </p>
                @endif
            </div>
        </div>
    </div>

    {{-- Sticker sheet: visible on screen too (as a preview) so the admin
         isn't printing blind, but its layout only has to be exactly right
         for @media print — screen presentation is a secondary concern. --}}
    <div class="max-w-7xl mx-auto px-4 pb-12 sm:px-6 lg:px-8 print:max-w-none print:p-0">
        <div class="qr-sticker-sheet grid grid-cols-2 gap-4 sm:grid-cols-4">
            @foreach ($airConditioners as $ac)
                <div class="qr-sticker rounded-lg border border-gray-200 p-2 text-center">
                    <img src="{{ route('admin.air-conditioners.qr-code', $ac) }}"
                         alt="{{ __('QR code for :code', ['code' => $ac->ac_code]) }}"
                         class="mx-auto w-full max-w-[40mm]">
                    <p class="mt-1 font-mono text-xs font-semibold text-gray-900">{{ $ac->ac_code }}</p>
                    <p class="text-[10px] text-gray-500">{{ $ac->room->building->name }} / {{ $ac->room->name }}</p>
                </div>
            @endforeach
        </div>
    </div>

    <style>
        @media print {
            /* Only the sticker sheet survives on paper; everything else
               (nav, header, filter form) is print:hidden via Tailwind above,
               but this belt-and-suspenders rule covers anything outside
               that isn't tagged, per the project's standard print pattern. */
            body * {
                visibility: hidden;
            }
            .qr-sticker-sheet,
            .qr-sticker-sheet * {
                visibility: visible;
            }
            .qr-sticker-sheet {
                position: absolute;
                top: 0;
                left: 0;
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 4mm;
                width: 100%;
            }
            .qr-sticker {
                width: 40mm;
                border-color: #d1d5db !important;
                break-inside: avoid;
            }
            @page {
                margin: 5mm;
            }
        }
    </style>
</x-app-layout>
