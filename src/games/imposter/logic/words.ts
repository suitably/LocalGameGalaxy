import type { Category } from './types';

export const CATEGORIES: Category[] = [
    {
        id: 'animals',
        name: { en: 'Animals', de: 'Tiere' },
        words: [
            {
                en: 'Lion',
                de: 'Löwe',
                hint: { en: 'King of the jungle', de: 'König der Tiere' }
            },
            {
                en: 'Elephant',
                de: 'Elefant',
                hint: { en: 'Has a trunk', de: 'Hat einen Rüssel' }
            },
            {
                en: 'Giraffe',
                de: 'Giraffe',
                hint: { en: 'Long neck', de: 'Langer Hals' }
            },
            {
                en: 'Penguin',
                de: 'Pinguin',
                hint: { en: 'Bird that cannot fly', de: 'Vogel der nicht fliegen kann' }
            }
        ]
    },
    {
        id: 'food',
        name: { en: 'Food', de: 'Essen' },
        words: [
            {
                en: 'Pizza',
                de: 'Pizza',
                hint: { en: 'Italian round dough', de: 'Italienischer runder Teig' }
            },
            {
                en: 'Burger',
                de: 'Burger',
                hint: { en: 'Fast food in a bun', de: 'Fast Food in einem Brötchen' }
            },
            {
                en: 'Sushi',
                de: 'Sushi',
                hint: { en: 'Japanese rice and fish', de: 'Japanischer Reis und Fisch' }
            },
            {
                en: 'Pasta',
                de: 'Pasta',
                hint: { en: 'Noodles', de: 'Nudeln' }
            }
        ]
    },
    {
        id: 'cities',
        name: { en: 'Cities', de: 'Städte' },
        words: [
            {
                en: 'Paris',
                de: 'Paris',
                hint: { en: 'City of love', de: 'Stadt der Liebe' }
            },
            {
                en: 'Berlin',
                de: 'Berlin',
                hint: { en: 'Capital of Germany', de: 'Hauptstadt von Deutschland' }
            },
            {
                en: 'London',
                de: 'London',
                hint: { en: 'Big Ben', de: 'Big Ben' }
            },
            {
                en: 'New York',
                de: 'New York',
                hint: { en: 'The Big Apple', de: 'Der Big Apple' }
            }
        ]
    }
];
