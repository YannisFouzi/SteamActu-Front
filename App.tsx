/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {PaperProvider} from 'react-native-paper';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {PAPER_THEME} from './src/constants';
import {AppProvider} from './src/context/AppContext';
import {FeedbackProvider} from './src/feedback';
import AppNavigator from './src/navigation/AppNavigator';
import TutorialProvider from './src/tutorial/TutorialContext';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={PAPER_THEME}>
        <FeedbackProvider>
          <AppProvider>
            <TutorialProvider>
              <AppNavigator />
            </TutorialProvider>
          </AppProvider>
        </FeedbackProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default App;
