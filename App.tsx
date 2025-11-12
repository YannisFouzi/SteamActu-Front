/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppProvider} from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import TutorialProvider from './src/tutorial/TutorialContext';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <TutorialProvider>
          <AppNavigator />
        </TutorialProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}

export default App;
