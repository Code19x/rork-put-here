# PutHere — Personal Stuff Tracker App


## Features

- **Add & manage items** — Log any personal item with a name, photo, notes, category, and location
- **Photo upload** — Attach a photo to each item using your camera or photo library
- **Categories** — Choose from preset categories (Electronics, Documents, Clothing, Tools, Collectibles, Kitchen, Garage, Bedroom, Closet, Storage Room, Misc) or create your own
- **Location tracking** — Assign a room/location to each item so you always know where things are
- **Search & filter** — Quickly find items by name, category, or location
- **Notes per item** — Add detailed notes or descriptions to any item
- **Edit & delete** — Update or remove items anytime
- **PIN lock** — Set a 6-digit PIN to lock the app; auto-locks when leaving the app, unlock with PIN instead of email login each time. New users are prompted to set up PIN after signup (with skip option). Splash screen stays visible while the app finishes loading.
- **Biometric unlock** — Use Face ID, Touch ID, or fingerprint to unlock the app instead of PIN
- **Change PIN** — Update or remove existing PIN from settings
- **Auto-lock timeout** — Choose how quickly the app locks: immediately, after 1 min, or after 5 min
- **Notifications & Reminders** — Toggle periodic reminders to update/organize items
- **Export Data** — Export all items as CSV or JSON for backup
- **Change Display Name** — Edit the name shown on the home screen from settings
- **Change Profile Photo** — Update profile image from settings
- **Delete Account** — Permanently remove account and all data
- **Shared Access** — Invite another user by email to access the same account
- **Share Items** — Share individual item details with others via the system share sheet
- **About section** — Display app version, rate the app (App Store link), share the app download link
- **Privacy policy** — No age restrictions; comprehensive privacy policy accessible from app menu

## Design

- **Warm earthy color palette** — Rich amber, terracotta accents, warm browns, and creamy off-white backgrounds. Inspired by cozy, organic aesthetics
- **Textured cards** — Items displayed as warm-toned cards with rounded corners and soft shadows
- **Bottom tab navigation** — Two main tabs: Items (home) and Categories
- **Floating action button** — A warm terracotta "+" button to add new items quickly
- **Clean typography** — Bold headings, readable body text, muted labels
- **Empty states** — Friendly illustrations and prompts when no items exist yet

## Screens

- **Items (Home)** — A scrollable list/grid of all stashed items with search bar at top and filter chips for categories/locations
- **Item Detail** — Full view of an item showing its photo, name, category, location, notes, and actions to edit, share, or delete
- **Add/Edit Item** — Form screen to enter item name, pick a category, assign a location, write notes, and upload a photo
- **Categories** — Browse and manage all categories, with the ability to add custom ones
- **App icon** — A warm amber and deep navy icon that incorporates the brand logo mark, simplified into a centered symbol with strong contrast for iOS and Android app icons
- **PIN Setup** — Two-step flow (create + confirm) to set up a PIN lock with animated keypad
- **PIN Lock Screen** — Full-screen PIN entry with shake animation on wrong attempts; optional biometric unlock button
- **Login** — Email sign-in/sign-up with verification flow
- **Settings** — Comprehensive settings with Security (PIN, biometrics, auto-lock), Notifications, Data & Storage (export), Account (name, photo, delete), Shared Access (invite users), and About (version, rate, share)
