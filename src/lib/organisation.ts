/**
 * The institution this deployment serves.
 *
 * This used to be a row in the `universities` table, read per request and
 * shown in the dashboard header. The system now serves one organisation, so
 * there is nothing to look up — but the name is still displayed in a few
 * places, so it lives here rather than being repeated as a literal at each
 * call site.
 *
 * F5 plans a `SystemSettings` table holding editable organisation details
 * (name, address, phone). When that lands, replace the readers of this
 * constant with that lookup; keeping it in one module is what makes that a
 * contained change.
 */
export const ORGANISATION_NAME = "มหาวิทยาลัยราชภัฏภูเก็ต";
