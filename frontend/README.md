# ElderCare AI Frontend

Modern, animated React-based frontend for the intelligent elderly care system.

## 🎨 Features

### Interactive User Interface
- **Real-time Chat Interface**: Voice-enabled conversation with empathetic AI assistant
- **Emotion Visualization**: Beautiful, animated emotion indicators with intensity scaling
- **Health Schedule**: Personalized daily nudges and medication reminders with category icons
- **Anomaly Detection Alerts**: Visual representation of behavioral anomalies with z-score metrics
- **Alzheimer's Risk Assessment**: Risk scoring with cognitive feature breakdown
- **Caregiver Dashboard**: Comprehensive care overview with mood distribution, interaction stats, and alerts

### Animation & UX
- **Framer Motion**: Smooth, physics-based animations for all interactions
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark Mode Ready**: Easy theme switching (can be extended)
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation
- **Large Text**: Senior-friendly font sizes and high contrast ratios

### Dashboard Views
1. **User (Chat) View**
   - Conversation history with emotion detection
   - Real-time emotion, anomaly, and Alzheimer's risk indicators
   - Quick message input with send button
   - Auto-scrolling to latest messages

2. **Caregiver View**
   - Critical alerts dashboard
   - Weekly interaction metrics
   - Mood distribution pie chart
   - Top concerns and care action suggestions
   - Missed reminders tracking
   - Silence period monitoring

## 📦 Dependencies

### Core
- **React 18**: Latest React for UI components
- **React Router**: Client-side routing
- **Vite**: Lightning-fast build tool and dev server
- **TypeScript**: Type-safe development

### Animations
- **Framer Motion**: Professional motion library
- **React Spring**: Spring physics animations

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful SVG icons
- **Recharts**: React charting library for analytics

### Data & API
- **Axios**: HTTP client for backend communication
- **Date-fns**: Modern date utility library
- **Zustand**: State management (optional, can be extended)

## 🚀 Getting Started

### Prerequisites
- Node.js 16.x or higher
- npm or yarn package manager

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Setup

Create a `.env.local` file:

```env
VITE_API_URL=http://localhost:8000
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── ChatDisplay.tsx
│   │   ├── EmotionIndicator.tsx
│   │   ├── HealthSchedule.tsx
│   │   ├── AnomalyAlert.tsx
│   │   ├── AlzheimerRisk.tsx
│   │   ├── CaregiverDashboard.tsx
│   │   └── index.ts
│   ├── services/
│   │   └── api.ts          # Backend API client
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # React entry point
│   └── index.css           # Global styles
├── index.html              # HTML template
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript config
├── tailwind.config.js      # Tailwind CSS config
├── postcss.config.js       # PostCSS config
├── package.json            # Dependencies
└── README.md               # This file
```

## 🎯 Component Overview

### ChatDisplay
Displays conversation history with emotion badges and typing indicators.
- Message animations
- Role-based styling (user/assistant)
- Emotion label display
- Loading animation

### EmotionIndicator
Visual emotion detection display with intensity bar.
- Icon animation based on emotion
- Color-coded by emotion type
- Intensity percentage calculation
- Empathetic messaging

### HealthSchedule
Shows daily reminders and upcoming events.
- Category-based icons (medication, meals, activity)
- Time-based ordering
- Animated nudges
- Hover effects for better UX

### AnomalyAlert
Behavioral anomaly detection visualization.
- Normal/Anomaly indicator
- Z-score metrics display
- Reason breakdown
- Color-coded severity

### AlzheimerRisk
Cognitive risk assessment display.
- Risk percentage with pulse animation
- Risk level indicator
- Feature breakdown
- Confidence score
- Clinical recommendations

### CaregiverDashboard
Comprehensive care management view.
- Critical alerts section
- Key metrics cards
- Emotion distribution pie chart
- Top concerns list
- Suggested care actions

## 🔌 API Integration

The frontend communicates with the Python backend via REST API:

```typescript
// Example API call
const output = await apiClient.processInteraction(
  text,
  userId,
  sessionId
);

// Response includes:
// - response: string
// - emotion: { label, score }
// - memory_hits: Memory[]
// - anomaly_alert: AnomalyAlert
// - caregiver_dashboard: CaregiverDashboard
// - alzheimer_risk: AlzheimerRisk
```

### Endpoints

- `POST /api/process` - Process user interaction
- `GET /api/history/:userId` - Get session history
- `GET /api/summary/:userId` - Get weekly summary
- `GET /api/user/:userId` - Get user profile

## 🎨 Styling & Customization

### Color Scheme
- Primary: Blue (#2563eb)
- Secondary: Purple (#7c3aed)
- Emotions: Yellow, Blue, Orange, Gray

### Tailwind CSS
All components use Tailwind utility classes. Customize via `tailwind.config.js`.

### Animations
Adjust animation durations in individual components using Framer Motion's `transition` prop.

## ♿ Accessibility Features

- Semantic HTML structure
- ARIA labels for icons
- Keyboard-navigable buttons
- High contrast ratios for elderly users
- Large default font sizes (text-lg, text-base)
- Focus indicators on interactive elements

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Touch-friendly button sizes (48px minimum)
- Collapsible mobile menu
- Optimized layouts for different screen sizes

## 🔐 Security Considerations

- API calls via axios with CORS support
- Environment variables for sensitive data
- No hardcoded credentials
- Session ID generation on app load
- User ID configuration

## 🐛 Development Tips

### Hot Module Replacement (HMR)
Vite automatically reloads when files change during development.

### Debug Mode
Use browser DevTools to inspect React components via React DevTools extension.

### API Debugging
Monitor network requests in the Network tab to debug API calls.

### Component Testing
Components can be tested independently by creating `*.test.tsx` files with Vitest.

## 📈 Performance Optimizations

- Code splitting via Vite
- Image optimization (consider adding)
- Lazy loading for routes (can be added)
- Memoization for expensive computations
- CSS minification in production

## 🚢 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
vercel deploy
```

### Deploy to Netlify
```bash
npm run build
netlify deploy --prod --dir=dist
```

### Environment Variables
Set `VITE_API_URL` to your production backend URL.

## 📝 License

MIT License - See LICENSE file

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open Pull Request

## 📞 Support

For issues or questions:
- Check existing GitHub issues
- Create a new issue with detailed description
- Include browser/device information
- Provide error messages and screenshots

## 🎓 Learning Resources

- [React Documentation](https://react.dev)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Framer Motion Guide](https://www.framer.com/motion/)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
