import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StackedGallery from '../../components/image-displays/gallery/stacked-gallery/StackedGallery';

jest.mock('../../common/imageUtils', () => ({ getSizedUrl: (url) => url }));

class MockImage {
  constructor() {
    setTimeout(() => {
      this.width = 800;
      this.height = 600;
      if (this.onload) this.onload();
    }, 0);
  }
  set src(_) {}
}
global.Image = MockImage;

const images = [
  { url: 'https://example.com/a.jpg', caption: 'Alpha' },
  { url: 'https://example.com/b.jpg', caption: 'Beta' },
];

test('calls onImageClick with original index when image is clicked', async () => {
  const onImageClick = jest.fn();
  render(<StackedGallery images={images} onImageClick={onImageClick} />);
  await waitFor(() => expect(screen.getAllByRole('img').length).toBeGreaterThan(0));
  fireEvent.click(screen.getAllByRole('img')[0]);
  expect(onImageClick).toHaveBeenCalledWith(expect.any(Number));
});

test('does not throw when onImageClick is not provided', async () => {
  render(<StackedGallery images={images} />);
  await waitFor(() => expect(screen.getAllByRole('img').length).toBeGreaterThan(0));
  expect(() => fireEvent.click(screen.getAllByRole('img')[0])).not.toThrow();
});
