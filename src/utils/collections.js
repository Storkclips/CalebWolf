import { clientCollections, collections } from '../data';

const normalizeCollection = (collection) => ({
  ...collection,
  imageObjects: collection.images.map((src, index) => ({
    id: `${collection.id}-${index + 1}`,
    src,
    title: `${collection.title} — Frame ${index + 1}`,
    price: collection.pricePerImage ?? 3,
  })),
});

export const normalizedClientCollections = clientCollections.map(normalizeCollection);
export const normalizedCollections = collections.map(normalizeCollection);
