# Design Guidelines: AI Internship Allocation Platform

## Design Approach
**System**: Material Design principles with custom pastel aesthetics
**Key References**: Modern government portals (clean, accessible) + Tinder (swipe UX) + Notion (clean dashboards)

## Visual Language

### Color & Treatment
- **Palette**: Pastel colors throughout (soft blues, gentle purples, muted greens, warm peaches)
- **Cards**: Rounded corners (border-radius: 1rem to 1.5rem)
- **Shadows**: Soft, subtle shadows for depth (no harsh drop shadows)
- **Mode**: Dark/light mode toggle in all portals (implement theme switcher in header)
- **Floating Elements**: Subtle floating animations on cards and UI components

### Typography
- **Headings**: Bold, modern sans-serif (Inter or similar)
- **Body**: Clean, readable sans-serif
- **Hierarchy**: Clear distinction between portal names, section titles, and content text
- **Logo Treatment**: Government logo + portal name prominently in header

### Spacing & Layout
- **Spacing Units**: Consistent use of 4, 8, 16, 24, 32px
- **Card Padding**: Generous internal padding (24-32px)
- **Section Spacing**: Clear breathing room between major sections (48-64px vertical)
- **Container Width**: Max-width constraints for readability (1280px for dashboards, 1440px for home)

## Portal-Specific Layouts

### Home Page
- **Header**: Government logo (left) + Portal name (center) + Language selector (right: English/Hindi dropdown)
- **Tagline**: Large, centered beneath header
- **Stats Bar**: Horizontal bar with 4-6 animated counters (total internships, active students, companies, success rate)
- **Hero Section**: Interactive India heatmap with glowing dots indicating internship locations (use map visualization library)
- **Success Stories**: Card grid (3 columns desktop, 1 mobile) with photos, names, testimonials
- **Reviews Carousel**: Auto-scrolling testimonial slider
- **Notification Bar**: Fixed bottom bar with scrolling live updates ticker
- **Images**: Use representative images for success stories (student photos), keep heatmap as primary visual hero

### Student Portal
- **Loading State**: Eligibility checker widget (progress indicator with criteria checkmarks)
- **Authentication**: QR code scan mockup (centered card with animated QR placeholder)
- **Profile Setup**: Multi-step form with progress indicator, clean input fields
- **Search Interface**: Prominent search bar with filter chips below
- **Tinder-Style Matching**: Full-screen card interface with swipe gestures (left = pass, right = interested), overlay buttons for mobile/desktop clicks
- **Application Tracker**: Timeline visualization with conversion funnel stages (Applied → Shortlisted → Interviewed → Offered → Joined)
- **Feedback Form**: Clean modal or sidebar panel

### Company Portal
- **Dashboard**: Split layout - active roles list (left 40%) + pending applications grid (right 60%)
- **Shortlist Panel**: Drag-and-drop interface with candidate cards (Kanban-style columns: AI Shortlist → Human Review → Selected)
- **Human Override**: Toggle switches and manual ranking controls
- **Onboarding Section**: Document generation interface (offer/rejection letter templates with preview)
- **Metrics**: Small stat cards showing hiring pipeline numbers

### Government Admin Portal
- **Dashboard**: Grid of metric cards (daily stats, trends charts)
- **Policy Sliders**: Range inputs with visual feedback for policy adjustments
- **Verification Panel**: Document review interface with approve/reject actions
- **Moderation Queue**: List view of pending company approvals with quick action buttons
- **Grievance Panel**: Ticket-style interface with status filters
- **Operations Center**: Form for creating circulars, notification broadcast interface

## Component Library

### Navigation
- **Portal Headers**: Logo + portal name + user profile dropdown + dark/light toggle
- **Breadcrumbs**: For nested sections in admin/company portals
- **Tab Navigation**: For switching between portal sections

### Forms & Inputs
- **Input Fields**: Rounded, floating labels, pastel focus states
- **Buttons**: Primary (pastel accent), Secondary (outline), with rounded corners
- **Dropdowns**: Custom styled with smooth animations
- **File Upload**: Drag-and-drop zones with visual feedback

### Data Display
- **Cards**: Rounded, floating with soft shadows, pastel backgrounds
- **Tables**: Minimal borders, zebra striping in light pastels, sortable headers
- **Charts**: Soft pastel color schemes, animated on load
- **Progress Indicators**: Smooth animated progress bars and circular loaders

### Interactive Elements
- **Drag-and-Drop**: Visual lift on grab, drop zones with dashed borders
- **Swipe Cards**: Smooth animations, subtle rotation on drag
- **Toggles**: Smooth slide transitions with pastel states
- **Modals**: Centered with backdrop blur

## Animations & Microinteractions
- **Card Hover**: Subtle lift (translate-y: -4px) + shadow increase
- **Button Clicks**: Gentle scale down (0.95)
- **Page Transitions**: Fade in content on route change
- **Stat Counters**: Count-up animation on page load
- **Notification Bar**: Continuous horizontal scroll
- **Loading States**: Skeleton screens with shimmer effect
- **Map Dots**: Pulsing glow animation for internship locations

## Responsive Behavior
- **Desktop First**: Optimize for 1440px+ screens
- **Tablet**: Adjust grids to 2 columns, maintain functionality
- **Mobile**: Single column, stack elements, simplify complex interactions
- **Heatmap**: Scale appropriately, ensure dots remain visible

## Images
- **Success Stories**: Professional headshots or candid student photos (3-4 images in grid)
- **Reviews**: Small circular avatars next to testimonials
- **No large hero image**: The India heatmap serves as the primary visual focal point on home page
- **Portal Backgrounds**: Subtle gradient overlays or geometric patterns in pastel tones