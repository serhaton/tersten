# App Store bilgileri – Türkçe – sürüm 1.1

Sürüm 1.0 yayında. Bunlar 1.1 güncellemesinin metinleri; 1.0 metinleri `docs/app-store/tr.md` dosyasında.
1.1 ekran görüntüleri `store-screenshots/1.1` klasöründe.

Her bloğu App Store Connect'teki ilgili alana kopyala.
Karakter sayıları Apple'ın sınırlarına göre kontrol edildi.

## Ad (en fazla 30)

```
Tersten: Ters Ses Oyunu
```

## Alt başlık (en fazla 30)

```
Ters Konuşma Taklit Yarışması
```

## Bu sürümdeki yenilikler (en fazla 4000)

```
Daha sade bir oyun, artık iPad'de de.

• Yeni oyun ekranı: her adımda tek büyük buton; sıra kimde, ne yapılacak hep belli
• 2. oyuncu için Dinle ve Kaydet yan yana; ters kelimeyi istediği kadar dinleyebilir
• Kayıt, dokunduğun anda başlar; kelimenin başı artık kesilmiyor
• Taklidin, düze çevrilmiş olarak kendiliğinden çalar
• iPad için tasarlandı: dikeyde ve yatayda daha büyük yerleşim
• Yeni Yılbaşı teması: çıngırak sesleri ve yılbaşı kelimeleri (Cadılar Bayramı'nın yerine geldi)
• Sistem yazı boyutu büyükken yazılar artık butonların üstüne binmiyor
• Ayarlar'da gizlilik politikası bağlantısı; iPad'i ve mikrofon göstergesini de anlatan güncel gizlilik politikası
```

## Tanıtım metni (en fazla 170)

```
Bir kelime söyle, tersten dinle, taklit et ve düze çevir. Arkadaşın ne dediğini bulabilecek mi? İki kişilik kahkaha dolu bir parti oyunu, Türkçe ve İngilizce.
```

## Açıklama (en fazla 4000)

```
Tersten, sesinin geri geri gittiği parti oyunu.

1. oyuncu gizlice bir kelime kaydeder. 2. oyuncu bu kelimeyi tersten dinler, duyduğu tuhaf sesi olabildiğince aynen taklit eder ve kaydeder. Sonra uygulama 2. oyuncunun taklidini düze çevirir. Gerçek kelimeye benziyor mu? Tahminini söyle, cevabı aç ve gülmeye hazırlan.

NASIL OYNANIR
1. Bir konsept seç.
2. 1. oyuncu gizli bir kelime kaydeder. Fikir mi lazım? Zara basıp kelime önerisi al, görmek için basılı tut.
3. 2. oyuncu kelimeyi tersten dinler ve taklit eder.
4. Uygulama taklidi ters çevirir. Dinle, tahmin et ve cevabı aç.
5. Yeni bir tura başlayın ve rolleri değiştirin.

YEDİ KONSEPT
• Futbolcular
• Yılbaşı
• Ünlüler
• Arabalar
• Hayvanlar
• Yemekler
• Diğer – aklına ne gelirse söyle; sonunda gösterilsin istersen gizli kelimeni yaz

Her konseptin kendi rengârenk duvar kağıdı, kendi ses efektleri ve kendi kelime önerileri var: Türkçede 100'den fazla, İngilizcede de yaklaşık 100 kelime.

ÖZELLİKLER
• İki oyuncu, tek iPhone ya da iPad: hesap yok, üyelik yok
• Anında kayıt: Kaydet'e bas ve konuş
• Türkçe ve İngilizce; kelime önerileri seçtiğin dilde
• Hakem düdüğünden kızak çıngıraklarına temaya özel sesler; istersen Ayarlar'dan kapat
• Sesin cihazında kalır: kayıtlar cihazda ters çevrilir, hiçbir yere yüklenmez ve oyun bitince silinir

Oyun geceleri, aile buluşmaları, yolculuklar ve partiler için birebir.

Tersten ücretsizdir ve reklamlarla desteklenir.
```

## Anahtar kelimeler (en fazla 100, virgülle ayrılmış, boşluksuz)

```
reverse,audio,singing,challenge,geri,sarma,kelime,tahmin,parti,eğlence,arkadaş,komik,kayıt,aile,grup
```

Türkiye mağazasında bu oyun türü çoğunlukla İngilizce adıyla ("reverse audio") arandığı için İngilizce terimler bilerek eklendi. Adda ve alt başlıkta geçen kelimeler (tersten, ters, ses, oyunu, konuşma, taklit, yarışması) tekrar edilmedi.

## Telif hakkı (Copyright)

Telif hakkı alanı dile göre değişmez, tek bir değer girilir.

```
2026 Serhat Onal
```

## App Review bilgileri – Notlar

App Review notları dile göre ayrılmaz ve Apple ekibi İngilizce okur. App Store Connect'e `1.1/en.md` dosyasındaki İngilizce metni gönder. Notlar yalnızca 1.1 güncellemesini anlatır: uygulamadaki yenilikler, mağaza bilgilerindeki değişiklikler (alt başlık, anahtar kelimeler, ekran görüntüleri, gizlilik politikası, App Privacy yanıtlarının düzeltilmesi), test adımları, turuncu mikrofon göstergesinin açıklaması ve test edilen cihazlar.

## App Privacy – adım adım nasıl doldurulur

Ürün sayfasında şu an "Data Not Collected" (Veri toplanmıyor) yazıyor. Bu yanlış: uygulama Google AdMob reklamı gösteriyor ve Google Mobile Ads SDK veri topluyor. Aşağıdaki yanıtlar Google'ın bu SDK için yayımladığı kılavuza dayanıyor (https://developers.google.com/admob/ios/privacy/data-disclosure). App Privacy, sürümden ayrı düzenlenir: bildiğimiz kadarıyla yayımladığın anda, inceleme beklemeden geçerli olur.

1. App Store Connect › uygulaman › sol menüde **App Privacy** › "Data Collection" yanındaki **Edit** (ya da **Get Started**).
2. "Do you or your third-party partners collect data from this app?" › **Yes, we collect data from this app** › Next.
3. Tam olarak şu yedi veri türünü işaretle, sonra Save:
   - Location › **Coarse Location**
   - Identifiers › **Device ID**
   - Usage Data › **Product Interaction**
   - Usage Data › **Advertising Data**
   - Diagnostics › **Crash Data**
   - Diagnostics › **Performance Data**
   - Diagnostics › **Other Diagnostic Data**
4. Her veri türünün yanında bir "Set Up" bağlantısı çıkar. Her biri için aynı üç soruyu şöyle yanıtla:

   | Veri türü | İşaretlenecek amaçlar | Kullanıcının kimliğine bağlı mı? | İzleme için kullanılıyor mu? |
   |---|---|---|---|
   | Coarse Location | Third-Party Advertising | Yes | No |
   | Device ID | Third-Party Advertising, Analytics | Yes | No |
   | Product Interaction | Third-Party Advertising, Analytics | Yes | No |
   | Advertising Data | Third-Party Advertising, Analytics | Yes | No |
   | Crash Data | Analytics | No | No |
   | Performance Data | Third-Party Advertising, Analytics | Yes | No |
   | Other Diagnostic Data | Third-Party Advertising, Analytics | No | No |

5. Önizlemeyi kontrol et: "Data Linked to You" ve "Data Not Linked to You" bölümleri görünmeli; "Data Used to Track You" bölümü olmamalı.
6. **Publish**'e bas.
7. Aynı sayfadaki Privacy Policy URL alanının https://serhaton.com/tersten/1.1/en/privacy.html olduğundan emin ol (Türkçe: https://serhaton.com/tersten/1.1/tr/privacy.html).

Bu yanıtların ikisi yoruma dayanıyor; içine sindiğinden emin ol:
- **Kimliğe bağlı: Yes.** Uygulamada hesap yok, ama Apple cihaz kimliğine bağlı veriyi "bağlı" sayıyor ve Google reklam verisiyle birlikte cihaz kimliği topluyor. Google çökme kayıtlarını "kullanıcıyla ilgisiz" diye tanımladığı için orada "No".
- **İzleme: No.** Uygulama App Tracking Transparency iznini istemiyor, IDFA'yı hiç okumuyor ve gizlilik bildiriminde izleme yapmadığı yazıyor. İleride ATT izni eklersen bu yanıtlar Yes olmalı.

## Adresler (yeni alan adı: serhaton.com)

Göndermeden önce `docs/1.1` sayfaları yayında olmalı; uygulamadaki "Gizlilik politikası" bağlantısı 1.1 sayfasını açar.

- Gizlilik politikası: https://serhaton.com/tersten/1.1/tr/privacy.html
- Destek: https://serhaton.com/tersten/1.1/tr/support.html
- Pazarlama: https://serhaton.com/tersten/1.1/tr/
