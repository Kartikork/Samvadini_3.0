# Assets Folder

This folder contains all static assets used in the application.

## Structure

```
assets/
├── images/          # Image files (PNG, JPG, etc.)
│   ├── logo.png     # App logo
│   └── ...
├── icons/           # Icon files
│   └── ...
├── fonts/           # Custom font files
│   └── ...
└── README.md        # This file
```

## Usage

### Images
```typescript
import logo from '../assets/images/logo.png';

<Image source={logo} />
```

### Icons
```typescript
import iconName from '../assets/icons/iconName.png';

<Image source={iconName} />
```

### Fonts
Fonts should be linked using `react-native-asset` or manually configured in:
- iOS: `ios/hyped/Info.plist`
- Android: `android/app/src/main/assets/fonts/`

## Best Practices

1. **Optimize images** before adding them to reduce bundle size
2. **Use appropriate formats**: PNG for transparency, JPG for photos, SVG for scalable graphics
3. **Organize by feature** if you have many assets
4. **Use consistent naming** conventions (camelCase or kebab-case)
