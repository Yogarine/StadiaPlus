import { Component } from '../Component';
import Logger from '../Logger';
import Util from '../Util';
import { UIButton } from '../ui/UIButton';
import { UIComponent } from '../ui/UIComponent';
import './styles/NetworkMonitor.scss';

// Import the Monitor runnable as a raw string
// @ts-ignore
import runnable from '!raw-loader!../MonitorRunnable';
import { Checkbox, CheckboxAnimation } from '../ui/Checkbox';
import { Language } from '../Language';
import { LocalStorage } from '../Storage';

const { chrome, RTCPeerConnection } = (window as any);

/**
 * A network monitor allowing users to see their network statistics while playing a game.
 *
 * @export the NetworkMonitor type.
 * @class NetworkMonitor
 * @extends {Component}
 */
export class NetworkMonitor extends Component {
    /**
     * The component tag, used in language files.
     */
    tag: string = 'network-monitor';

    /**
     * The tab element.
     */
    tabElement: HTMLElement;

    /**
     * The monitor element.
     */
    element: HTMLElement;

    /**
     * The [[UIComponent]] used to display the tab.
     */
    component: UIComponent;

    /**
     * The [[UIButton]] used to open the tab.
     */
    button: UIButton;
    
    /**
     * Whether the component is active or not.
     */
    active: boolean = false;

    /**
     * Whether the monitor is open or not.
     */
    monitorOpen: boolean = false;

    constructor() {
        super();

        this.element = document.createElement('div');
        this.element.classList.add('stadiaplus_network-monitor');

        document.addEventListener('DOMContentLoaded', () => {
            this.startRunnable();
        })
    }

    /**
     * Visible network statistics.
     */
    visible: any = {
        'time': true,
        'resolution': true,
        'FPS': true,
        'latency': true,
        'codec': true,
        'traffic': true,
        'current-traffic': true,
        'average-traffic': true,
        'packets-lost': true,
        'average-packet-loss': true,
        'jitter-buffer': true,
    };

    /**
     * Which order the network statistics show up in.
     */
    orderMap: any = [
        'time',
        'resolution',
        'FPS',
        'latency',
        'codec',
        'traffic',
        'current-traffic',
        'average-traffic',
        'packets-lost',
        'average-packet-loss',
        'jitter-buffer'
    ]

    /**
     * Creates a [[UIComponent]] and a [[UIButton]].
     * 
     * @memberof NetworkMonitor
     */
    createUI() {
        this.component = new UIComponent(
            Language.get('network-monitor.name'),
            `
            <div class='CTvDXd QAAyWd Fjy05d ivWUhc QSDHyc rpgZzc RkyH1e stadiaplus_button stadiaplus_networkmonitor-toggle-button' id='${this.id}-togglebutton'>Network Monitor</div>
            <hr>
            <h6>${Language.get('network-monitor.heading-visible')}</h6>
            <ul id='${this.id}-visiblelist'></ul>
            <hr>
            <p class='stadiaplus_muted'>
                <strong>Why is my network speed so much lower than normal?</strong></br></br>
                The statistics shown in the network monitor have changed units from bits (b) to bytes (B). This means the statistics in 2.2 and later will be around 1/8 of what they were in 2.1.
            </p>
            `,
            this.id,
        );
        this.component.element.classList.add('stadiaplus_networkmonitor-tab');

        const icon = chrome.runtime.getURL('images/icons/network-monitor.svg');
        this.button = new UIButton(icon, Language.get('network-monitor.button-label'), this.id + '-button');

        this.getStorage(() => { this.updateVisible() });
    }

    /**
     * Start the network monitor runnable.
     *
     * @memberof NetworkMonitor
     */
    startRunnable() {
        Util.desandbox(runnable);
    }

    /**
     * Open the monitor.
     *
     * @memberof NetworkMonitor
     */
    openMonitor() {
        this.monitorOpen = true;
        Util.desandbox('StadiaPlusMonitor.start()');
    }

    /**
     * Close the monitor.
     *
     * @memberof NetworkMonitor
     */
    closeMonitor() {
        this.monitorOpen = false;
        Util.desandbox('StadiaPlusMonitor.stop()');
    }
    
    /**
     * Updates the current variable states with information from the chrome storage.
     *
     * @param {(() => any)} [callback=(() => {})] callback called after storage update.
     * @memberof NetworkMonitor
     */
    getStorage(callback: (() => any) = (() => {})) {
        LocalStorage.MONITOR_STATS.get((result: any) => {
            if(result[LocalStorage.MONITOR_STATS.tag]) {
                this.visible = result[LocalStorage.MONITOR_STATS.tag];
            }
            callback();
        })
    }

    /**
     * Updates the chrome storage with information from the current variable states.
     *
     * @param {(() => any)} [callback=(() => {})] callback called after storage update.
     * @memberof NetworkMonitor
     */
    setStorage(callback: (() => any) = (() => {})) {
        LocalStorage.MONITOR_STATS.set(this.visible, callback);
    }

    /**
     * Called on startup, initializes important variables.
     * 
     * @memberof NetworkMonitor
     */
    onStart(): void {
        this.active = true;
        this.startRunnable();
        this.createUI();

        Logger.component(Language.get('component.enabled', { name: this.name }));
    }

    /**
     * Called on stop, makes sure to dispose of elements and variables.
     * 
     * @memberof NetworkMonitor
     */
    onStop(): void {
        this.active = false;
        this.button.element.remove();
        this.button.destroy();
        this.component.element.remove();
        this.closeMonitor();

        Util.desandbox('StadiaPlusMonitor = null');

        Logger.component(Language.get('component.disabled', { name: this.name }));
    }

    /**
     * Updates which statistics should be visible.
     *
     * @memberof NetworkMonitor
     */
    updateVisible() {
        Util.desandbox(`StadiaPlusMonitor.setVisible(${JSON.stringify(this.visible)})`);
    }

    /**
     * Called every second, makes sure to create components if they don't already exist.
     * 
     * @memberof NetworkMonitor
     */
    onUpdate() {
        // Only create components if the menu is open already.
        if (Util.isMenuOpen() && Util.isInGame()) {
            if (!this.exists()) {
                const self = this;
                this.updateRenderer();
                this.component.create();

                this.component.onOpen(() => {
                    Util.desandbox('StadiaPlusMonitor.setEditable(true)');
                });

                this.component.onClose(() => {
                    Util.desandbox('StadiaPlusMonitor.setEditable(false)');
                });
                
                const list = document.getElementById(this.id + '-visiblelist');            
                for(const key of this.orderMap) {
                    const name: string = key.replace(/-/g, ' ').split(' ').map((name:string) => name.substring(0, 1).toUpperCase() + name.substring(1)).join(' ');
                    const value: boolean = this.visible[key];
                    const item = document.createElement('li');

                    const {pretty, checkbox} = new Checkbox(name).setBigger(true).setAnimation(CheckboxAnimation.SMOOTH).build();
                    pretty.classList.add('stadiaplus_networkmonitor-checkbox');

                    item.appendChild(pretty);
                    list.appendChild(item);
                    
                    checkbox.checked = value;
                    checkbox.addEventListener('click', () => {
                        this.visible[key] = checkbox.checked;
                        this.updateVisible();
                        this.setStorage();
                    });
                }

                const toggleButton = document.getElementById(this.id + '-togglebutton');
                toggleButton.classList.toggle('shown', this.monitorOpen);
                
                toggleButton.addEventListener('click', () => {
                    if(!this.monitorOpen) {
                        this.openMonitor();
                    }
                    else {
                        this.closeMonitor();
                    }
                    toggleButton.classList.toggle('shown', this.monitorOpen);
                });

                this.button.create(() => {
                    self.button.button.addEventListener('click', () => {
                        self.component.openTab();
                    });
                });
            }

            if(!this.button.container.exists()) {
                this.button.container.create();
            }
        }
        else if(this.component.open) {
            this.component.closeTab();
        }
        
        if(!Util.isInGame() && document.querySelector('body>.stadiaplus_networkmonitor')) {
            this.closeMonitor();
        }
    }
}