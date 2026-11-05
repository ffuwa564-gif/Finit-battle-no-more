import { useState, type ReactNode } from 'react';
import { ScrollText } from 'lucide-react';
import { Button, Modal } from './index';
import { tr } from '../locales/i18n';

/** Shared, collapsed entry for the home and map objectives. */
export function WorldObjectiveDock({ location, incident, children }: {
    location: 'home' | 'map';
    incident: boolean;
    children: (close: () => void) => ReactNode;
}) {
    const [open, setOpen] = useState(false);
    return <div className={`world-objective-dock world-objective-dock--${location}${incident ? ' is-incident' : ''}`}>
        <Button variant="icon" className="world-objective-dock__trigger" aria-label={`${tr('旅の大目標')}${incident ? `：${tr('事件発生')}` : ''}`} title={tr('旅の大目標')} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
            <ScrollText size={20} aria-hidden="true"/>{incident && <span className="world-objective-dock__badge" aria-hidden="true"/>}
        </Button>
        <Modal open={open} title={tr('旅の大目標')} className="world-objective-dialog" onClose={() => setOpen(false)}>{children(() => setOpen(false))}</Modal>
    </div>;
}
