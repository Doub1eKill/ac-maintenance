{{-- Shared by create.blade.php and edit.blade.php: everything except the room field,
     which differs (selectable on create, locked/read-only on edit) --}}
<div>
    <x-input-label for="brand" :value="__('Brand')" />
    <x-text-input id="brand" name="brand" type="text" class="block mt-1 w-full"
                  :value="old('brand', $airConditioner->brand ?? '')" required autofocus />
    <x-input-error :messages="$errors->get('brand')" class="mt-2" />
</div>

<div class="mt-4">
    <x-input-label for="model" :value="__('Model (optional)')" />
    <x-text-input id="model" name="model" type="text" class="block mt-1 w-full"
                  :value="old('model', $airConditioner->model ?? '')" />
    <x-input-error :messages="$errors->get('model')" class="mt-2" />
</div>

<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div>
        <x-input-label for="btu" :value="__('BTU (optional)')" />
        <x-text-input id="btu" name="btu" type="number" min="1000" max="200000" class="block mt-1 w-full"
                      :value="old('btu', $airConditioner->btu ?? '')" />
        <x-input-error :messages="$errors->get('btu')" class="mt-2" />
    </div>

    <div>
        <x-input-label for="installed_at" :value="__('Installed on (optional)')" />
        <x-text-input id="installed_at" name="installed_at" type="date" class="block mt-1 w-full"
                      :value="old('installed_at', optional($airConditioner->installed_at ?? null)->format('Y-m-d'))" />
        <x-input-error :messages="$errors->get('installed_at')" class="mt-2" />
    </div>
</div>

<div class="mt-4">
    <x-input-label for="status" :value="__('Status')" />
    @php $currentStatus = old('status', $airConditioner->status ?? 'normal'); @endphp
    <select id="status" name="status" required
        class="block mt-1 w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm">
        <option value="normal" @selected($currentStatus === 'normal')>{{ __('Normal') }}</option>
        <option value="needs_cleaning" @selected($currentStatus === 'needs_cleaning')>{{ __('Needs Cleaning') }}</option>
        <option value="broken" @selected($currentStatus === 'broken')>{{ __('Broken') }}</option>
    </select>
    <x-input-error :messages="$errors->get('status')" class="mt-2" />
</div>
