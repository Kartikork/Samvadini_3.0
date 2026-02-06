/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { NotificationService } from './src/services/NotificationService';

// Register background message handlers
// This must be called at the top level, not inside any component
// Firebase should auto-initialize from native config files (google-services.json)
NotificationService.registerBackgroundHandlers();

AppRegistry.registerComponent(appName, () => App);
