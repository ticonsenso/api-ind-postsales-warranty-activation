import { invoiceExtractionSchema } from './invoice-extraction.schema';

describe('invoiceExtractionSchema', () => {
  it('asks for the scores last so the model judges them after extracting', () => {
    const properties = Object.keys(invoiceExtractionSchema.shape);

    expect(properties.slice(-2)).toEqual(['scoreImage', 'scoreResult']);
  });
});
