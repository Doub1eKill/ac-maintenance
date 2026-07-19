<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Log Maintenance Work') }}
        </h2>
    </x-slot>

    <form method="POST" action="{{ route('tech.maintenance-logs.store') }}" class="flex min-h-[calc(100vh-64px)] flex-col">
        @csrf
        {{-- air_conditioner_id is the only thing the client identifies —
             user_id and performed_at are fixed server-side in
             MaintenanceLogController@store, never trusted from here. --}}
        <input type="hidden" name="air_conditioner_id" value="{{ $airConditioner->id }}">
        {{-- Only present when arriving from a claimed pool job (see
             WorkOrderController@claim) — submitting this form is what
             closes that job, via MaintenanceLogController@store. --}}
        @if ($workOrder)
            <input type="hidden" name="work_order_id" value="{{ $workOrder->id }}">
        @endif

        <div class="flex-1 space-y-4 p-4">
            {{-- Read-only unit info — not editable here on purpose, this
                 form only records what work was done, not which unit. --}}
            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p class="font-mono text-base font-semibold text-gray-900">{{ $airConditioner->ac_code }}</p>
                <p class="text-sm text-gray-500">
                    {{ $airConditioner->room->building->name }} / {{ $airConditioner->room->name }}
                </p>
                @if ($workOrder)
                    <p class="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {{ __('Closing claimed job #:id', ['id' => $workOrder->id]) }}
                    </p>
                @endif
            </div>

            @if ($errors->any())
                <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    @foreach ($errors->all() as $error)
                        <p>{{ $error }}</p>
                    @endforeach
                </div>
            @endif

            <fieldset>
                <legend class="mb-2 text-sm font-medium text-gray-700">{{ __('Type of Work') }}</legend>
                {{-- Big tappable buttons, not a <select> — gloved fingers and
                     small dropdown targets don't mix. Fixed 3-option list
                     (cleaning/repair/refill_refrigerant) per the domain —
                     never add a 4th option here without updating the
                     backend's Rule::in() too. --}}
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label class="flex items-center justify-center rounded-lg border-2 border-gray-300 py-4 text-base font-medium text-gray-700 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700">
                        <input type="radio" name="action" value="cleaning" class="sr-only" required
                               @checked(old('action') === 'cleaning')>
                        {{ __('Cleaning') }}
                    </label>
                    <label class="flex items-center justify-center rounded-lg border-2 border-gray-300 py-4 text-base font-medium text-gray-700 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700">
                        <input type="radio" name="action" value="repair" class="sr-only" required
                               @checked(old('action') === 'repair')>
                        {{ __('Repair') }}
                    </label>
                    <label class="flex items-center justify-center rounded-lg border-2 border-gray-300 py-4 text-base font-medium text-gray-700 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700">
                        <input type="radio" name="action" value="refill_refrigerant" class="sr-only" required
                               @checked(old('action') === 'refill_refrigerant')>
                        {{ __('Refill Refrigerant') }}
                    </label>
                </div>
                <x-input-error :messages="$errors->get('action')" class="mt-2" />
            </fieldset>

            <div>
                <label for="notes" class="mb-1 block text-sm font-medium text-gray-700">
                    {{ __('Notes (optional)') }}
                </label>
                <textarea id="notes" name="notes" rows="4"
                    class="w-full rounded-lg border-gray-300 p-3 text-base focus:border-indigo-500 focus:ring-indigo-500">{{ old('notes') }}</textarea>
                <x-input-error :messages="$errors->get('notes')" class="mt-2" />
            </div>
        </div>

        {{-- Sticky submit: stays in thumb reach regardless of scroll
             position, and survives a shaky signal since it's a plain form
             POST rather than an AJAX call that could silently fail. --}}
        <div class="sticky bottom-0 border-t border-gray-200 bg-white p-4">
            <button type="submit"
                class="w-full rounded-lg bg-blue-600 py-4 text-base font-semibold text-white active:bg-blue-700">
                {{ __('Save') }}
            </button>
        </div>
    </form>
</x-app-layout>
