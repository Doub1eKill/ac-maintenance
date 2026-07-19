{{-- Shared by create.blade.php and edit.blade.php --}}
<div>
    <x-input-label for="name" :value="__('Name')" />
    <x-text-input id="name" name="name" type="text" class="block mt-1 w-full"
                  :value="old('name', $building->name ?? '')" required autofocus />
    <x-input-error :messages="$errors->get('name')" class="mt-2" />
</div>

<div class="mt-4">
    <x-input-label for="abbreviation" :value="__('Abbreviation (used in AC codes, e.g. B1)')" />
    <x-text-input id="abbreviation" name="abbreviation" type="text" maxlength="10" class="block mt-1 w-full uppercase"
                  :value="old('abbreviation', $building->abbreviation ?? '')" required />
    <x-input-error :messages="$errors->get('abbreviation')" class="mt-2" />
</div>
