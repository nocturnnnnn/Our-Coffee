import { Coffee } from 'lucide-react';
import type { ComponentProps } from 'react';

export default function AppLogoIcon(props: ComponentProps<typeof Coffee>) {
    return <Coffee {...props} />;
}
