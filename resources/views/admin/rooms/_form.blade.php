{{-- Shared by create.blade.php and edit.blade.php --}}
<div>
    <x-input-label for="name" :value="__('Room name / number')" />
    <x-text-input id="name" name="name" type="text" class="block mt-1 w-full"
                  :value="old('name', $room->name ?? '')" required autofocus />
    <x-input-error :messages="$errors->get('name')" class="mt-2" />
</div>

<div class="mt-4">
    <x-input-label for="floor" :value="__('Floor (optional)')" />
    <x-text-input id="floor" name="floor" type="number" min="0" max="200" class="block mt-1 w-full"
                  :value="old('floor', $room->floor ?? '')" />
    <x-input-error :messages="$errors->get('floor')" class="mt-2" />
</div>
