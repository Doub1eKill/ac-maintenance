<x-app-layout>
    <x-slot name="header">
        <nav class="text-sm text-gray-500 mb-1" aria-label="Breadcrumb">
            <a href="{{ route('admin.buildings.index') }}" class="hover:underline">{{ __('Buildings') }}</a>
            <span class="mx-1">/</span>
            <a href="{{ route('admin.buildings.rooms.index', $building) }}" class="hover:underline">{{ $building->name }}</a>
        </nav>
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Add Room') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-2xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                <form method="POST" action="{{ route('admin.buildings.rooms.store', $building) }}" class="space-y-4">
                    @csrf
                    @include('admin.rooms._form')

                    <div class="flex items-center justify-end gap-3">
                        <a href="{{ route('admin.buildings.rooms.index', $building) }}" class="text-sm text-gray-600 hover:underline">
                            {{ __('Cancel') }}
                        </a>
                        <x-primary-button>{{ __('Save') }}</x-primary-button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</x-app-layout>
