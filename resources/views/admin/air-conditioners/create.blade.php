<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Register Air Conditioner') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-2xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">

                <p class="mb-4 text-sm text-gray-500">
                    {{ __('The AC code (e.g. PKRU-B1-101-01) is generated automatically from the room you pick below once you save — there is nothing to type for it.') }}
                </p>

                <form method="POST" action="{{ route('admin.air-conditioners.store') }}" class="space-y-4">
                    @csrf

                    <div>
                        <x-input-label for="room_id" :value="__('Room')" />
                        <select id="room_id" name="room_id" required
                            class="block mt-1 w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm">
                            <option value="">{{ __('Select a room') }}</option>
                            @forelse ($buildings as $building)
                                @if ($building->rooms->isNotEmpty())
                                    <optgroup label="{{ $building->name }}">
                                        @foreach ($building->rooms as $room)
                                            <option value="{{ $room->id }}" @selected(old('room_id') == $room->id)>
                                                {{ $room->name }}
                                            </option>
                                        @endforeach
                                    </optgroup>
                                @endif
                            @empty
                                <option value="" disabled>{{ __('No buildings yet — add a building and room first') }}</option>
                            @endforelse
                        </select>
                        <x-input-error :messages="$errors->get('room_id')" class="mt-2" />
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
