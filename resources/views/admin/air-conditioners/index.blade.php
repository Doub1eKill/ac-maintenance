<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Air Conditioners') }}
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
                    <h3 class="text-lg font-medium text-gray-900">{{ __('All units') }}</h3>
                    <div class="flex items-center gap-3">
                        <a href="{{ route('admin.air-conditioners.print') }}"
                           class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            {{ __('Print QR Stickers') }}
                        </a>
                        <a href="{{ route('admin.air-conditioners.create') }}"
                           class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                            {{ __('Register Air Conditioner') }}
                        </a>
                    </div>
                </div>

                {{-- Desktop-first data table, but still horizontally scrollable
                     rather than squeezed, in case an admin opens this on a tablet --}}
                <div class="overflow-x-auto rounded-lg border border-gray-200">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('AC Code') }}</th>
                                <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('Location') }}</th>
                                <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('Brand') }}</th>
                                <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('Status') }}</th>
                                <th scope="col" class="px-4 py-3"><span class="sr-only">{{ __('Actions') }}</span></th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            @forelse ($airConditioners as $ac)
                                <tr>
                                    <td class="px-4 py-3 font-mono font-medium text-gray-900">{{ $ac->ac_code }}</td>
                                    <td class="px-4 py-3 text-gray-600">
                                        {{ $ac->room->building->name }} / {{ $ac->room->name }}
                                    </td>
                                    <td class="px-4 py-3 text-gray-600">{{ $ac->brand }}</td>
                                    <td class="px-4 py-3">
                                        @include('admin.air-conditioners._status-badge', ['status' => $ac->status])
                                    </td>
                                    <td class="px-4 py-3">
                                        <div class="flex justify-end gap-3">
                                            <a href="{{ route('admin.air-conditioners.edit', $ac) }}"
                                               class="text-gray-600 hover:underline">{{ __('Edit') }}</a>
                                            <form method="POST" action="{{ route('admin.air-conditioners.destroy', $ac) }}"
                                                  onsubmit="return confirm('{{ __('Delete this air conditioner?') }}');">
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
                                    <td colspan="5" class="px-4 py-6 text-center text-gray-500">
                                        {{ __('No air conditioners registered yet.') }}
                                    </td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>

                <div class="mt-4">
                    {{ $airConditioners->links() }}
                </div>
            </div>
        </div>
    </div>
</x-app-layout>
