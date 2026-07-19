<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Edit Building') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-2xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                <form method="POST" action="{{ route('admin.buildings.update', $building) }}" class="space-y-4">
                    @csrf
                    @method('PUT')
                    @include('admin.buildings._form')

                    <div class="flex items-center justify-end gap-3">
                        <a href="{{ route('admin.buildings.index') }}" class="text-sm text-gray-600 hover:underline">
                            {{ __('Cancel') }}
                        </a>
                        <x-primary-button>{{ __('Save') }}</x-primary-button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</x-app-layout>
