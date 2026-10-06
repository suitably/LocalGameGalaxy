import { URLSearchParams } from 'url';

const searchParams = new URLSearchParams("tab=melodiq&sub=microphones");

const params = new URLSearchParams(searchParams);
params.set('tab', 'melodiq');
console.log(params.toString());

params.delete('tab');
params.delete('sub');
params.delete('section');
console.log(params.toString());
