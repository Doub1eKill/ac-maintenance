<x-app-layout>
    <x-slot name="header">
        <nav class="text-sm text-gray-500 mb-1" aria-label="Breadcrumb">
            <a href="{{ route('admin.buildings.index') }}" class="hover:underline">{{ __('Buildings') }}</a>
            <span class="mx-1">/</span>
            <span class="text-gray-700">{{ $building->name }}</span>
        </nav>
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Rooms in :building', ['building' => $building->name]) }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-4">

            @if (session('status'))
                <div class="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    {{ session('status') }}
                </div>
            @endif

            @if ($errors->any())
                <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    @foreach ($errors->all() as $error)
                        <p>{{ $error }}</p>
                    @endforeach
                </div>
            @endif

            <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-medium text-gray-900">{{ __('Rooms') }}</h3>
                    <a href="{{ route('admin.buildings.rooms.create', $building) }}"
                       class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        {{ __('Add Room') }}
                    </a>
                </div>

                <div class="overflow-x-auto rounded-lg border border-gray-200">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('Name') }}</th>
                                <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('Floor') }}</th>
                                <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('Air Conditioners') }}</th>
                                <th scope="col" class="px-4 py-3"><span class="sr-only">{{ __('Actions') }}</span></th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            @forelse ($rooms as $room)
                                <tr>
                                    <td class="px-4 py-3 font-medium text-gray-900">{{ $room->name }}</td>
                                    <td class="px-4 py-3 text-gray-600">{{ $room->floor ?? '-' }}</td>
                                    <td class="px-4 py-3 text-gray-600">{{ $room->air_conditioners_count }}</td>
                                    <td class="px-4 py-3">
                                        <div class="flex justify-end gap-3">
                                            <a href="{{ route('admin.rooms.edit', $room) }}"
                                               class="text-gray-600 hover:underline">{{ __('Edit') }}</a>
                                            <form method="POST" action="{{ route('admin.rooms.destroy', $room) }}"
                                                  onsubmit="return confirm('{{ __('Delete this room?') }}');">
                                                @csrf
                                                @method('DELETE')
                                                <button type="submit" class="text-red-600 hover:underline">
                                                    {{ __('Delete') }}
                                                </button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="4" class="px-4 py-6 text-center text-gray-500">
                                        {{ __('No rooms yet.') }}
                                    </td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>

                <div class="mt-4">
                    {{ $rooms->links() }}
                </div>
            </div>
        </div>
    </div>
</x-app-layout>
