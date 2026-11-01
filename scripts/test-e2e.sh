#!/bin/bash
# Uji alur API NYANDAK end-to-end
B=http://localhost:3000
J=/tmp/nyandak-test
rm -f $J-*.txt

echo "── 1. Login customer"
curl -s -c $J-cust.txt -X POST $B/api/auth -H 'content-type: application/json' \
  -d '{"action":"login","phone":"081200000004","password":"cust123"}' | head -c 200; echo

echo "── 2. Customer bikin order BELIIN Mendala→Manggis"
ORDER=$(curl -s -b $J-cust.txt -X POST $B/api/orders -H 'content-type: application/json' \
  -d '{"type":"BELIIN","villageFrom":"Mendala","villageTo":"Manggis","items":"Kopi 1 dus, gula 2kg (uji e2e)","budget":60000,"note":"uji coba"}')
echo "$ORDER" | head -c 300; echo
OID=$(echo "$ORDER" | python3 -c "import sys,json;print(json.load(sys.stdin)['order']['id'])")
echo "OID=$OID"

echo "── 3. Login kurir + online"
curl -s -c $J-kurir.txt -X POST $B/api/auth -H 'content-type: application/json' \
  -d '{"action":"login","phone":"081200000002","password":"kurir123"}' >/dev/null
curl -s -b $J-kurir.txt -X POST $B/api/auth -H 'content-type: application/json' -d '{"action":"toggleOnline","online":true}' | head -c 120; echo

echo "── 4. Kurir lihat papan"
BOARD=$(curl -s -b $J-kurir.txt "$B/api/orders")
echo "$BOARD" | python3 -c "import sys,json;d=json.load(sys.stdin);print('board:',[b['code'] for b in d['board']],'mine:',[m['code'] for m in d['mine']])"

echo "── 5. Kurir ambil order (race-safe)"
curl -s -b $J-kurir.txt -X PATCH $B/api/orders -H 'content-type: application/json' \
  -d "{\"id\":\"$OID\",\"action\":\"accept\"}"; echo
echo "── 5b. Ambil lagi (harus ditolak 409)"
curl -s -b $J-kurir.txt -X PATCH $B/api/orders -H 'content-type: application/json' \
  -d "{\"id\":\"$OID\",\"action\":\"accept\"}"; echo

echo "── 6. toDiantar sebelum struk disetujui (harus ditolak)"
curl -s -b $J-kurir.txt -X PATCH $B/api/orders -H 'content-type: application/json' \
  -d "{\"id\":\"$OID\",\"action\":\"toDiantar\"}"; echo

echo "── 7. Customer setujui struk"
curl -s -b $J-cust.txt -X PATCH $B/api/orders -H 'content-type: application/json' \
  -d "{\"id\":\"$OID\",\"action\":\"strukApprove\",\"approve\":true}"; echo

echo "── 8. Kurir antar lalu selesai"
curl -s -b $J-kurir.txt -X PATCH $B/api/orders -H 'content-type: application/json' \
  -d "{\"id\":\"$OID\",\"action\":\"toDiantar\"}"; echo
curl -s -b $J-kurir.txt -X PATCH $B/api/orders -H 'content-type: application/json' \
  -d "{\"id\":\"$OID\",\"action\":\"selesai\"}" | head -c 200; echo

echo "── 9. Chat: kurir kirim pesan ke order selesai (harus ditolak)"
curl -s -b $J-kurir.txt -X POST $B/api/chat -H 'content-type: application/json' \
  -d "{\"orderId\":\"$OID\",\"text\":\"tes\"}"; echo

echo "── 10. Tabungan kurir (harus ada FEE baru)"
curl -s -b $J-kurir.txt "$B/api/orders" | python3 -c "import sys,json;d=json.load(sys.stdin);print('ledger:',[(e['type'],e['amount'],e['settled']) for e in d['ledger']])"

echo "── 11. Admin: overview"
curl -s -c $J-admin.txt -X POST $B/api/auth -H 'content-type: application/json' \
  -d '{"action":"login","phone":"081200000001","password":"admin123"}' >/dev/null
curl -s -b $J-admin.txt "$B/api/admin?view=overview" | python3 -c "import sys,json;d=json.load(sys.stdin);print('stats:',d['stats'])"

echo "── 12. Admin approve kurir PENDING (Bang Dwi)"
DID=$(curl -s -b $J-admin.txt "$B/api/admin?view=people" | python3 -c "
import sys,json;d=json.load(sys.stdin)
print([k['id'] for k in d['kurirs'] if k['status']=='PENDING'][0])")
curl -s -b $J-admin.txt -X POST $B/api/admin -H 'content-type: application/json' -d "{\"action\":\"approveKurir\",\"id\":\"$DID\"}"; echo

echo "── 13. Admin settle fee kurir"
KID=$(curl -s -b $J-admin.txt "$B/api/admin?view=ledger" | python3 -c "
import sys,json;d=json.load(sys.stdin)
print([k['id'] for k in d['kurirs'] if k['outstanding']>0][0])")
curl -s -b $J-admin.txt -X POST $B/api/admin -H 'content-type: application/json' -d "{\"action\":\"settle\",\"kurirId\":\"$KID\"}"; echo

echo "── 14. Jam layanan: coba order zona C (harus masuk antrean karena sekarang malam WIB)"
curl -s -b $J-cust.txt -X POST $B/api/orders -H 'content-type: application/json' \
  -d '{"type":"ANTAR","villageFrom":"Mendala","villageTo":"Bumiayu","items":"Dokumen uji zona C"}' | python3 -c "
import sys,json;d=json.load(sys.stdin)
o=d.get('order',{});print('open:',d.get('open'),'statusDetail:',o.get('statusDetail'),'zone:',o.get('zone'),'fare:',o.get('fare'))"

echo "── 15. COD limit: beliin 500rb (harus ditolak)"
curl -s -b $J-cust.txt -X POST $B/api/orders -H 'content-type: application/json' \
  -d '{"type":"BELIIN","villageFrom":"Mendala","villageTo":"Mendala","items":"Uji limit","budget":500000}'; echo
