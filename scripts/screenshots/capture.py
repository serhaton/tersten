#!/usr/bin/env python3
"""
Takes the App Store screenshots on booted simulators.

Needs a simulator build made with the screenshot hook on (src/shot.ts):
  EXPO_PUBLIC_SHOTS=1 EXPO_PUBLIC_NO_ADS=1 npx expo run:ios --configuration Release --device <simulator>
Then: python3 scripts/screenshots/capture.py <version>   e.g. 1.2

For every device, language and screen it writes the app's storage (language and which screen to
open), relaunches the app and saves a screenshot to store-screenshots/<version>/<size>/<lang>/.
"""
import json, os, subprocess, sys, time
from PIL import Image

BUNDLE = 'com.serhatonal.tersten'
APP = os.path.expanduser('~/Library/Developer/Xcode/DerivedData')
# Folder name -> simulator name. The sizes are the ones App Store Connect asks for.
DEVICES = {
    '6.9-inch': 'iPhone 18 Pro Max',       # 1320 x 2868
    '6.3-inch': 'iPhone 18 Pro',           # 1206 x 2622
    '6.5-inch': 'iPhone 11 Pro Max',       # 1242 x 2688
    'ipad-13-inch': 'iPad Pro 13-inch (M5)',  # 2064 x 2752
}

def shots(lang):
    tr = lang == 'tr'
    game = lambda concept, mode='duo', **preset: {'screen': 'game', 'concept': concept, 'mode': mode, 'preset': preset}
    return [
        ('01-home', {'screen': 'home', 'concept': 'karisik'}),
        ('02-player1', game('noel', word='Kardan adam' if tr else 'Snowman')),
        ('03-player2', game('hayvanlar', orig=True)),
        ('04-answer', game('futbol', orig=True, imit=True, phase='result', word='Arda Güler' if tr else 'Lionel Messi')),
        ('05-score', game('unluler', orig=True, imit=True, phase='score', round=3, scores=[1, 2], lastCorrect=True,
                          word='Sezen Aksu' if tr else 'Taylor Swift')),
        ('06-solo', game('arabalar', 'solo', orig=True, imit=True, word='Ferrari')),
        ('07-settings', {'screen': 'home', 'concept': 'yemekler', 'settings': True}),
    ]

def sh(*args, check=True):
    return subprocess.run(args, check=check, capture_output=True, text=True).stdout.strip()

def udid(name):
    devices = json.loads(sh('xcrun', 'simctl', 'list', 'devices', 'booted', '-j'))['devices']
    for runtime in devices.values():
        for d in runtime:
            if d['name'] == name:
                return d['udid']
    sys.exit(f'Simulator not booted: {name}')

def find_app():
    for root, dirs, _ in os.walk(APP):
        if root.endswith('Release-iphonesimulator') and 'Tersten.app' in dirs:
            return os.path.join(root, 'Tersten.app')
    sys.exit('No simulator build found')

def main():
    version = sys.argv[1]
    only = sys.argv[2:]  # optional: folder names to limit the run to
    app = find_app()
    for folder, name in DEVICES.items():
        if only and folder not in only:
            continue
        dev = udid(name)
        sh('xcrun', 'simctl', 'install', dev, app)
        sh('xcrun', 'simctl', 'status_bar', dev, 'override', '--time', '09:41', '--batteryState', 'charged',
           '--batteryLevel', '100', '--cellularBars', '4', '--wifiBars', '3', check=False)
        # Creates the data container.
        sh('xcrun', 'simctl', 'launch', dev, BUNDLE, check=False)
        time.sleep(2)
        data = sh('xcrun', 'simctl', 'get_app_container', dev, BUNDLE, 'data')
        store = os.path.join(data, 'Library', 'Application Support', BUNDLE, 'RCTAsyncLocalStorage_V1')
        os.makedirs(store, exist_ok=True)
        for lang in ('tr', 'en'):
            out = os.path.join('store-screenshots', version, folder, lang)
            os.makedirs(out, exist_ok=True)
            for file, shot in shots(lang):
                sh('xcrun', 'simctl', 'terminate', dev, BUNDLE, check=False)
                with open(os.path.join(store, 'manifest.json'), 'w', encoding='utf8') as f:
                    json.dump({
                        'tersten.settings': json.dumps({'lang': lang, 'sound': True, 'introSeen': True}),
                        'tersten.shot': json.dumps(shot),
                    }, f)
                sh('xcrun', 'simctl', 'launch', dev, BUNDLE)
                time.sleep(7)  # the snowy Christmas wallpaper needs the longest
                target = os.path.join(out, f'{file}.png')
                sh('xcrun', 'simctl', 'io', dev, 'screenshot', target)
                # App Store Connect rejects images with an alpha channel.
                Image.open(target).convert('RGB').save(target, optimize=True)
                print(folder, lang, file)

if __name__ == '__main__':
    main()
