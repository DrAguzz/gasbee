# Rider Assignment & Realtime Notification Flow Documentation

This document explains the root causes of the issues in the rider assignment flow, details the modified files, and outlines how the realtime assignment works now.

---

## 1. Root Causes

### Issue A: Inactive Riders Received Jobs & Notifications
- **Cause**: The Rider app lacked a Postgres realtime listener on the `riders` table. The local `rider` profile state was loaded once on mount and remained stale.
- **Result**: When the merchant toggled a rider OFF (`is_active` set to `false`), the Rider app's local state still saw the rider as active. In addition, the `loadJobs` query and notification channel in `RiderJobAlert.tsx` did not verify the rider's `is_active` or `online` status before subscribing or fetching.

### Issue B: Manually Assigned Riders Did Not See Assigned Orders or Notifications
- **Cause**: 
  1. The `loadJobs` function queried only orders where `rider_id` was `NULL` (`.is("rider_id", null)`). Since manual assignment updates `rider_id` to the selected rider's ID, the assigned order was filtered out from their "Incoming Jobs" list.
  2. The orders list and notifications subscription did not dynamically update because the local `rider` profile state was stale when toggled ON.

---

## 2. Modified Files

### 1. [RiderDashboard.tsx](file:///Users/aguzzz/projects/gasbee/src/pages/rider/RiderDashboard.tsx)
- **Profile Synchronization**: Added a realtime listener on the `riders` table to sync the rider's local profile (`is_active` and `status`) in realtime.
- **Conditional Job Loading**: Updated `loadJobs` to check if the rider is active (`is_active === true`) and online (`status === 'online'`). If not, it clears the list and stops early.
- **Combined Query (.or)**: Rewrote the `loadJobs` query to fetch both unassigned orders (`rider_id` is null and status is `accepted`/`preparing`) AND manually assigned orders (`rider_id` is this rider's ID and status is `assigned`).
- **Active Orders Exclusion**: Excluded `assigned` status from `loadActive` and the active count to require riders to accept manual assignments first.
- **Clean Subscription Management**: Linked the orders channel dependency array to `[rider?.merchant_id, rider?.id, rider?.is_active, rider?.status]`. If the rider goes offline or is toggled OFF, the subscription is safely torn down.

### 2. [RiderJobAlert.tsx](file:///Users/aguzzz/projects/gasbee/src/components/merchant/RiderJobAlert.tsx)
- **State Integration**: Restructured to fetch the rider profile on mount and update it in realtime when changes occur on the `riders` table.
- **Dynamic Notifications**: Bound the `notifications` realtime subscription to only activate when the rider is active and online.

### 3. [RiderJobs.tsx](file:///Users/aguzzz/projects/gasbee/src/pages/rider/RiderJobs.tsx)
- **Synchronization**: Added active/online guards and aligned the order query to fetch both unassigned and manually assigned orders using the same `.or()` filter logic.

### 4. [RiderActive.tsx](file:///Users/aguzzz/projects/gasbee/src/pages/rider/RiderActive.tsx)
- **Clean Status Flow**: Excluded `"assigned"` from the query. Orders in the `"assigned"` state are not shown in active deliveries until the rider clicks "Accept Job" on the dashboard (which updates status to `"rider_accepted"`).

---

## 3. How Realtime Rider Assignment Works Now

The following step-by-step sequence describes the fixed realtime flow:

1. **Rider Logged In**:
   - The Rider app initializes. `RiderDashboard` and `RiderJobAlert` fetch the current rider record from the `riders` table.
   - They open a realtime channel (`rider-profile-${user.id}`) to listen to changes on their profile.

2. **Merchant Toggles Rider ON**:
   - In the Merchant dashboard, the merchant turns the rider toggle Switch to ON.
   - This updates `is_active` to `true` in the `riders` database table.
   - The Rider app's profile channel immediately captures the database update and sets the local `rider` state to active.
   - Because `rider.is_active` is now `true` and the rider is online, both `RiderDashboard` and `RiderJobAlert` dynamically open realtime channels for incoming orders and notifications.

3. **Merchant Manually Assigns Order**:
   - In the Merchant order detail page, the merchant selects the active rider and clicks **Assign**.
   - This updates the order's `rider_id` to the rider's ID, and sets status to `"assigned"`.
   - The database trigger `trg_notify_rider_assigned` fires automatically, inserting a notification record for the rider's user account.

4. **Rider Receives Notification & Job**:
   - The notification insert triggers the Rider app's notification subscriber (`RiderJobAlert.tsx`). The rider instantly hears a beep and sees a toast alert.
   - Concurrently, the update event on the orders table is caught by `RiderDashboard.tsx`. It runs the updated `loadJobs` function.
   - The `.or()` filter matches the order where `rider_id` is the current rider and status is `"assigned"`.
   - The order immediately appears under "Incoming Jobs" on the dashboard.

5. **Rider Accepts Job**:
   - The rider clicks **Accept Job**.
   - The app updates the order's status to `"rider_accepted"`.
   - The order immediately transitions out of "Incoming Jobs" and into "Current Jobs" / Active deliveries, and the merchant's screen updates in realtime showing the rider has accepted.
