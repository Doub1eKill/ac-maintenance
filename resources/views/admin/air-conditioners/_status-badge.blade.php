{{-- Shared status badge — color + text together, never color alone (WCAG) --}}
@php
    $styles = [
        'normal' => 'bg-green-100 text-green-800',
        'needs_cleaning' => 'bg-amber-100 text-amber-800',
        'broken' => 'bg-red-100 text-red-800',
    ];
    $dots = [
        'normal' => 'bg-green-500',
        'needs_cleaning' => 'bg-amber-500',
        'broken' => 'bg-red-500',
    ];
    $labels = [
        'normal' => __('Normal'),
        'needs_cleaning' => __('Needs Cleaning'),
        'broken' => __('Broken'),
    ];
@endphp
<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium {{ $styles[$status] }}">
    <span class="h-1.5 w-1.5 rounded-full {{ $dots[$status] }}"></span>
    {{ $labels[$status] }}
</span>
