pm.test('HTTP 200',()=>pm.response.to.have.status(200));
const data=pm.response.json().data;
pm.test('Khong qua 20 ket qua',()=>pm.expect(data.length).to.be.at.most(20));
pm.test('Chi dia diem approved',()=>pm.expect(data.every(x=>x.status==='approved')).to.be.true);
