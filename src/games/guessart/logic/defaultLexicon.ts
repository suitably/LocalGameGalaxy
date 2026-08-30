import type { CategoryItem, WordItem } from './types';

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  {
    "id": "cat_animals",
    "name": "Animals",
    "translations": [
      {
        "languageCode": "en",
        "name": "Animals"
      },
      {
        "languageCode": "de",
        "name": "Tiere"
      }
    ]
  },
  {
    "id": "cat_food",
    "name": "Food & Drinks",
    "translations": [
      {
        "languageCode": "en",
        "name": "Food & Drinks"
      },
      {
        "languageCode": "de",
        "name": "Essen & Trinken"
      }
    ]
  },
  {
    "id": "cat_objects",
    "name": "Everyday Objects",
    "translations": [
      {
        "languageCode": "en",
        "name": "Everyday Objects"
      },
      {
        "languageCode": "de",
        "name": "Alltagsgegenstände"
      }
    ]
  },
  {
    "id": "cat_activities",
    "name": "Activities & Sports",
    "translations": [
      {
        "languageCode": "en",
        "name": "Activities & Sports"
      },
      {
        "languageCode": "de",
        "name": "Aktivitäten & Sport"
      }
    ]
  },
  {
    "id": "cat_nature",
    "name": "Nature & Space",
    "translations": [
      {
        "languageCode": "en",
        "name": "Nature & Space"
      },
      {
        "languageCode": "de",
        "name": "Natur & Weltall"
      }
    ]
  },
  {
    "id": "cat_professions",
    "name": "Professions",
    "translations": [
      {
        "languageCode": "en",
        "name": "Professions"
      },
      {
        "languageCode": "de",
        "name": "Berufe"
      }
    ]
  },
  {
    "id": "cat_mtg8fkmo",
    "name": "Mythical Creatures",
    "translations": [
      {
        "languageCode": "en",
        "name": "Mythical Creatures"
      },
      {
        "languageCode": "de",
        "name": "Fabelwesen"
      }
    ]
  }
];

export const DEFAULT_WORDS: WordItem[] = [
  {
    "id": "w_mtg8ggi0_p0zf",
    "categoryId": "cat_mtg8fkmo",
    "word": "Dragon",
    "difficulty": 2,
    "translations": {
      "de": {
        "canonical": "Drache",
        "synonyms": []
      },
      "en": {
        "canonical": "Dragon",
        "synonyms": []
      }
    }
  },
  {
    "id": "w_mtg8d9h6_6jsn",
    "categoryId": "cat_animals",
    "word": "Mouse",
    "difficulty": 2,
    "translations": {
      "de": {
        "canonical": "Maus",
        "synonyms": [
          "Mäuse"
        ]
      },
      "en": {
        "canonical": "Mouse",
        "synonyms": [
          "mice"
        ]
      }
    }
  },
  {
    "id": "w_dog",
    "categoryId": "cat_animals",
    "word": "Dog",
    "difficulty": 1,
    "translations": {
      "en": {
        "canonical": "Dog",
        "synonyms": [
          "Puppy",
          "Hound",
          "Canine"
        ]
      },
      "de": {
        "canonical": "Hund",
        "synonyms": [
          "Welpe",
          "Köter",
          "Vierbeiner"
        ]
      }
    }
  },
  {
    "id": "w_cat",
    "categoryId": "cat_animals",
    "word": "Cat",
    "difficulty": 1,
    "translations": {
      "en": {
        "canonical": "Cat",
        "synonyms": [
          "Kitten",
          "Kitty",
          "Feline"
        ]
      },
      "de": {
        "canonical": "Katze",
        "synonyms": [
          "Kätzchen",
          "Kater",
          "Mieze"
        ]
      }
    }
  },
  {
    "id": "w_elephant",
    "categoryId": "cat_animals",
    "word": "Elephant",
    "difficulty": 2,
    "translations": {
      "en": {
        "canonical": "Elephant",
        "synonyms": [
          "Pachyderm"
        ]
      },
      "de": {
        "canonical": "Elefant",
        "synonyms": [
          "Dickhäuter"
        ]
      }
    }
  },
  {
    "id": "w_giraffe",
    "categoryId": "cat_animals",
    "word": "Giraffe",
    "difficulty": 2,
    "translations": {
      "en": {
        "canonical": "Giraffe",
        "synonyms": []
      },
      "de": {
        "canonical": "Giraffe",
        "synonyms": []
      }
    }
  },
  {
    "id": "w_penguin",
    "categoryId": "cat_animals",
    "word": "Penguin",
    "difficulty": 2,
    "translations": {
      "en": {
        "canonical": "Penguin",
        "synonyms": []
      },
      "de": {
        "canonical": "Pinguin",
        "synonyms": []
      }
    }
  },
  {
    "id": "w_kangaroo",
    "categoryId": "cat_animals",
    "word": "Kangaroo",
    "difficulty": 3,
    "translations": {
      "en": {
        "canonical": "Kangaroo",
        "synonyms": [
          "Roo"
        ]
      },
      "de": {
        "canonical": "Känguru",
        "synonyms": []
      }
    }
  },
  {
    "id": "w_chameleon",
    "categoryId": "cat_animals",
    "word": "Chameleon",
    "difficulty": 3,
    "translations": {
      "en": {
        "canonical": "Chameleon",
        "synonyms": []
      },
      "de": {
        "canonical": "Chamäleon",
        "synonyms": []
      }
    }
  },
  {
    "id": "w_pizza",
    "categoryId": "cat_food",
    "word": "Pizza",
    "difficulty": 1,
    "translations": {
      "en": {
        "canonical": "Pizza",
        "synonyms": [
          "Pizza slice"
        ]
      },
      "de": {
        "canonical": "Pizza",
        "synonyms": [
          "Pizzastück"
        ]
      }
    }
  },
  {
    "id": "w_icecream",
    "categoryId": "cat_food",
    "word": "Ice Cream",
    "difficulty": 1,
    "translations": {
      "en": {
        "canonical": "Ice Cream",
        "synonyms": [
          "Gelato",
          "Sundae"
        ]
      },
      "de": {
        "canonical": "Eis",
        "synonyms": [
          "Speiseeis",
          "Eiscreme",
          "Eiswaffel"
        ]
      }
    }
  },
  {
    "id": "w_burger",
    "categoryId": "cat_food",
    "word": "Burger",
    "difficulty": 1,
    "translations": {
      "en": {
        "canonical": "Burger",
        "synonyms": [
          "Hamburger",
          "Cheeseburger"
        ]
      },
      "de": {
        "canonical": "Burger",
        "synonyms": [
          "Hamburger",
          "Cheeseburger"
        ]
      }
    }
  },
  {
    "id": "w_sushi",
    "categoryId": "cat_food",
    "word": "Sushi",
    "difficulty": 2,
    "translations": {
      "en": {
        "canonical": "Sushi",
        "synonyms": [
          "Maki",
          "Nigiri"
        ]
      },
      "de": {
        "canonical": "Sushi",
        "synonyms": [
          "Maki",
          "Nigiri"
        ]
      }
    }
  },
  {
    "id": "w_coffee",
    "categoryId": "cat_food",
    "word": "Coffee",
    "difficulty": 1,
    "translations": {
      "en": {
        "canonical": "Coffee",
        "synonyms": [
          "Espresso",
          "Cappuccino"
        ]
      },
      "de": {
        "canonical": "Kaffee",
        "synonyms": [
          "Espresso",
          "Cappuccino"
        ]
      }
    }
  },
  {
    "id": "w_banana",
    "categoryId": "cat_food",
    "word": "Banana",
    "difficulty": 1,
    "translations": {
      "en": {
        "canonical": "Banana",
        "synonyms": []
      },
      "de": {
        "canonical": "Banane",
        "synonyms": []
      }
    }
  },
  {
    "id": "w_umbrella",
    "categoryId": "cat_objects",
    "word": "Umbrella",
    "difficulty": 1,
    "translations": {
      "en": {
        "canonical": "Umbrella",
        "synonyms": [
          "Parasol",
          "Brolly"
        ]
      },
      "de": {
        "canonical": "Regenschirm",
        "synonyms": [
          "Schirm",
          "Sonnenschirm"
        ]
      }
    }
  },
  {
    "id": "w_bicycle",
    "categoryId": "cat_objects",
    "word": "Bicycle",
    "difficulty": 2,
    "translations": {
      "en": {
        "canonical": "Bicycle",
        "synonyms": [
          "Bike",
          "Cycle"
        ]
      },
      "de": {
        "canonical": "Fahrrad",
        "synonyms": [
          "Rad",
          "Bike",
          "Drahtesel"
        ]
      }
    }
  },
  {
    "id": "w_guitar",
    "categoryId": "cat_objects",
    "word": "Guitar",
    "difficulty": 2,
    "translations": {
      "en": {
        "canonical": "Guitar",
        "synonyms": [
          "Acoustic guitar",
          "Electric guitar"
        ]
      },
      "de": {
        "canonical": "Gitarre",
        "synonyms": [
          "Klampfe",
          "E-Gitarre"
        ]
      }
    }
  },
  {
    "id": "w_clock",
    "categoryId": "cat_objects",
    "word": "Clock",
    "difficulty": 1,
    "translations": {
      "en": {
        "canonical": "Clock",
        "synonyms": [
          "Watch",
          "Timepiece"
        ]
      },
      "de": {
        "canonical": "Uhr",
        "synonyms": [
          "Armbanduhr",
          "Wanduhr",
          "Wecker"
        ]
      }
    }
  },
  {
    "id": "w_telescope",
    "categoryId": "cat_objects",
    "word": "Telescope",
    "difficulty": 3,
    "translations": {
      "en": {
        "canonical": "Telescope",
        "synonyms": [
          "Spyglass"
        ]
      },
      "de": {
        "canonical": "Fernrohr",
        "synonyms": [
          "Teleskop",
          "Spektiv"
        ]
      }
    }
  },
  {
    "id": "w_soccer",
    "categoryId": "cat_activities",
    "word": "Football",
    "difficulty": 1,
    "translations": {
      "en": {
        "canonical": "Football",
        "synonyms": [
          "Soccer"
        ]
      },
      "de": {
        "canonical": "Fußball",
        "synonyms": [
          "Kicken"
        ]
      }
    }
  },
  {
    "id": "w_swimming",
    "categoryId": "cat_activities",
    "word": "Swimming",
    "difficulty": 2,
    "translations": {
      "en": {
        "canonical": "Swimming",
        "synonyms": [
          "Swim"
        ]
      },
      "de": {
        "canonical": "Schwimmen",
        "synonyms": [
          "Baden"
        ]
      }
    }
  },
  {
    "id": "w_skiing",
    "categoryId": "cat_activities",
    "word": "Skiing",
    "difficulty": 2,
    "translations": {
      "en": {
        "canonical": "Skiing",
        "synonyms": [
          "Ski"
        ]
      },
      "de": {
        "canonical": "Skifahren",
        "synonyms": [
          "Ski",
          "Schifahren"
        ]
      }
    }
  },
  {
    "id": "w_dancing",
    "categoryId": "cat_activities",
    "word": "Dancing",
    "difficulty": 2,
    "translations": {
      "en": {
        "canonical": "Dancing",
        "synonyms": [
          "Dance",
          "Ballet"
        ]
      },
      "de": {
        "canonical": "Tanzen",
        "synonyms": [
          "Tanz",
          "Ballett"
        ]
      }
    }
  },
  {
    "id": "w_volcano",
    "categoryId": "cat_nature",
    "word": "Volcano",
    "difficulty": 2,
    "translations": {
      "en": {
        "canonical": "Volcano",
        "synonyms": [
          "Eruption"
        ]
      },
      "de": {
        "canonical": "Vulkan",
        "synonyms": [
          "Ausbruch"
        ]
      }
    }
  },
  {
    "id": "w_rainbow",
    "categoryId": "cat_nature",
    "word": "Rainbow",
    "difficulty": 1,
    "translations": {
      "en": {
        "canonical": "Rainbow",
        "synonyms": []
      },
      "de": {
        "canonical": "Regenbogen",
        "synonyms": []
      }
    }
  },
  {
    "id": "w_rocket",
    "categoryId": "cat_nature",
    "word": "Rocket",
    "difficulty": 2,
    "translations": {
      "en": {
        "canonical": "Rocket",
        "synonyms": [
          "Spaceship",
          "Spacecraft"
        ]
      },
      "de": {
        "canonical": "Rakete",
        "synonyms": [
          "Raumschiff"
        ]
      }
    }
  },
  {
    "id": "w_waterfall",
    "categoryId": "cat_nature",
    "word": "Waterfall",
    "difficulty": 2,
    "translations": {
      "en": {
        "canonical": "Waterfall",
        "synonyms": [
          "Cascade"
        ]
      },
      "de": {
        "canonical": "Wasserfall",
        "synonyms": [
          "Kaskade"
        ]
      }
    }
  },
  {
    "id": "w_doctor",
    "categoryId": "cat_professions",
    "word": "Doctor",
    "difficulty": 2,
    "translations": {
      "en": {
        "canonical": "Doctor",
        "synonyms": [
          "Physician",
          "Surgeon"
        ]
      },
      "de": {
        "canonical": "Arzt",
        "synonyms": [
          "Ärztin",
          "Doktor",
          "Mediziner"
        ]
      }
    }
  },
  {
    "id": "w_astronaut",
    "categoryId": "cat_professions",
    "word": "Astronaut",
    "difficulty": 2,
    "translations": {
      "en": {
        "canonical": "Astronaut",
        "synonyms": [
          "Cosmonaut",
          "Spaceman"
        ]
      },
      "de": {
        "canonical": "Astronaut",
        "synonyms": [
          "Kosmonaut",
          "Astronautin"
        ]
      }
    }
  },
  {
    "id": "w_firefighter",
    "categoryId": "cat_professions",
    "word": "Firefighter",
    "difficulty": 2,
    "translations": {
      "en": {
        "canonical": "Firefighter",
        "synonyms": [
          "Fireman"
        ]
      },
      "de": {
        "canonical": "Feuerwehrmann",
        "synonyms": [
          "Feuerwehr",
          "Feuerwehrfrau"
        ]
      }
    }
  },
  {
    "id": "w_chef",
    "categoryId": "cat_professions",
    "word": "Chef",
    "difficulty": 2,
    "translations": {
      "en": {
        "canonical": "Chef",
        "synonyms": [
          "Cook"
        ]
      },
      "de": {
        "canonical": "Koch",
        "synonyms": [
          "Köchin",
          "Chefkoch"
        ]
      }
    }
  }
];
