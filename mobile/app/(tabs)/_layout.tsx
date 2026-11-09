import { Tabs } from 'expo-router';
import { AppHeader, TabBar } from '@/components/Chrome';

export default function TabsLayout() {
  return (
    <Tabs tabBar={props => <TabBar {...props} />} screenOptions={{ header: () => <AppHeader /> }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="shop" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="wishlist" />
      <Tabs.Screen name="cart" />
    </Tabs>
  );
}
