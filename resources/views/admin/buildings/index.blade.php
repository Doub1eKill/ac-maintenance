<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Buildings') }}
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
                    <h3 class="text-lg font-medium text-gray-900">{{ __('Your buildings') }}</h3>
                    <a href="{{ route('admin.buildings.create') }}"
                       class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        {{ __('Add Building') }}
                    </a>
                </div>

                <div class="overflow-x-auto rounded-lg border border-gray-200">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('Name') }}</th>
                                <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('Abbreviation') }}</th>
                                <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('Rooms') }}</th>
                                <th scope="col" class="px-4 py-3"><span class="sr-only">{{ __('Actions') }}</span></th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            @forelse ($buildings as $building)
                                <tr>
                                    <td class="px-4 py-3 font-medium text-gray-900">{{ $building->name }}</td>
                                    <td class="px-4 py-3 text-gray-600">{{ $building->abbreviation }}</td>
                                    <td class="px-4 py-3 text-gray-600">{{ $building->rooms_count }}</td>
                                    <td class="px-4 py-3">
                                        <div class="flex justify-end gap-3">
                                            <a href="{{ route('admin.buildings.rooms.index', $building) }}"
                                               class="text-blue-600 hover:underline">{{ __('Manage rooms') }}</a>
                                            <a href="{{ route('admin.buildings.edit', $building) }}"
                                               class="text-gray-600 hover:underline">{{ __('Edit') }}</a>
                                            <form method="POST" action="{{ route('admin.buildings.destroy', $building) }}"
                                                  onsubmit="return confirm('{{ __('Delete this building?') }}');">
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
                                        {{ __('No buildings yet.') }}
                                    </td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>

                <div class="mt-4">
                    {{ $buildings->links() }}
                </div>
            </div>
        </div>
    </div>
</x-app-layout>
