<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Maintenance History') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-4">
            <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">

                {{-- Custom filters, not DataTables' built-in search box (disabled
                     below) — ac_code/technician_name are computed from relations
                     on the backend, not real columns DataTables' generic search
                     can touch, so filtering goes through these specific fields
                     instead. --}}
                <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    <div>
                        <x-input-label for="date_from" :value="__('From date')" />
                        <x-text-input id="date_from" type="date" class="mt-1 block" />
                    </div>
                    <div>
                        <x-input-label for="date_to" :value="__('To date')" />
                        <x-text-input id="date_to" type="date" class="mt-1 block" />
                    </div>
                    <div class="sm:w-56">
                        <x-input-label for="technician" :value="__('Technician name')" />
                        <x-text-input id="technician" type="text" class="mt-1 block w-full" :placeholder="__('Search by name')" />
                    </div>
                    <div class="flex gap-2">
                        <button type="button" id="apply-filters"
                            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                            {{ __('Apply Filters') }}
                        </button>
                        <button type="button" id="clear-filters"
                            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            {{ __('Clear') }}
                        </button>
                    </div>
                </div>

                <div class="overflow-x-auto rounded-lg border border-gray-200">
                    <table id="maintenance-logs-table" class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('Date Performed') }}</th>
                                <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('AC Code') }}</th>
                                <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('Technician') }}</th>
                                <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('Action') }}</th>
                                <th scope="col" class="px-4 py-3 text-left font-medium text-gray-600">{{ __('Notes') }}</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    {{-- CDN, not the Vite bundle — this project has no jQuery/DataTables in
         its npm dependencies yet, and this is the only page that needs them. --}}
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.11/css/jquery.dataTables.min.css">
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.11/js/jquery.dataTables.min.js"></script>

    <script>
        // Kept as a handful of small, named functions rather than one long
        // jQuery chain, so each piece (reading filters, wiring buttons) can
        // be read on its own.
        document.addEventListener('DOMContentLoaded', () => {
            const table = initMaintenanceLogsTable();
            wireFilterControls(table);
        });

        function initMaintenanceLogsTable() {
            return $('#maintenance-logs-table').DataTable({
                serverSide: true,
                processing: true,
                searching: false, // replaced by the date/technician filters above
                order: [[0, 'desc']],
                ajax: {
                    url: '{{ route('admin.maintenance-logs.data') }}',
                    data: (params) => {
                        params.date_from = document.getElementById('date_from').value;
                        params.date_to = document.getElementById('date_to').value;
                        params.technician = document.getElementById('technician').value;
                    },
                },
                columns: [
                    // performed_at is a real column on maintenance_logs, so
                    // yajra can sort it server-side. The rest are computed
                    // from relations (ac_code/technician_name) or free text
                    // (notes), so sorting is disabled for them.
                    { data: 'performed_at', orderable: true },
                    { data: 'ac_code', orderable: false },
                    { data: 'technician_name', orderable: false },
                    { data: 'action', orderable: false },
                    { data: 'notes', orderable: false, defaultContent: '-' },
                ],
            });
        }

        function wireFilterControls(table) {
            document.getElementById('apply-filters').addEventListener('click', () => table.draw());

            document.getElementById('clear-filters').addEventListener('click', () => {
                document.getElementById('date_from').value = '';
                document.getElementById('date_to').value = '';
                document.getElementById('technician').value = '';
                table.draw();
            });
        }
    </script>
</x-app-layout>
