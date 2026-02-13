import { useCallback } from 'react';
import { BackHandler, Alert } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

const useHardwareBackHandler = (exitRouteName = 'Dashboard') => {
    const navigation = useNavigation();
    const route = useRoute();

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (route.name === exitRouteName) {
                    Alert.alert(
                        'Exit App',
                        'Are you sure you want to exit?',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'YES', onPress: () => BackHandler.exitApp() }
                        ]
                    );
                    return true;
                }

                if (navigation.canGoBack()) {
                    navigation.goBack();
                    return true;
                }

                navigation.reset({
                    index: 0,
                    routes: [{ name: exitRouteName }]
                });

                return true;
            };

            const subscription = BackHandler.addEventListener(
                'hardwareBackPress',
                onBackPress
            );

            return () => subscription.remove();

        }, [navigation, route.name, exitRouteName])
    );
};

export default useHardwareBackHandler;
