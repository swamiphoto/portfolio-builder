import { render, screen, fireEvent } from '@testing-library/react';
import MasonryGallery from '../../components/image-displays/gallery/masonry-gallery/MasonryGallery';

jest.mock('react-masonry-css', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
jest.mock('../../common/imageUtils', () => ({ getSizedUrl: (url) => url }));

const images = [
  { url: 'https://example.com/a.jpg', caption: 'Alpha' },
  { url: 'https://example.com/b.jpg', caption: 'Beta' },
];

test('calls onImageClick with correct index for first image', () => {
  const onImageClick = jest.fn();
  render(<MasonryGallery images={images} onImageClick={onImageClick} />);
  const imgs = screen.getAllByRole('img');
  fireEvent.click(imgs[0]);
  expect(onImageClick).toHaveBeenCalledWith(0);
});

test('calls onImageClick with correct index for second image', () => {
  const onImageClick = jest.fn();
  render(<MasonryGallery images={images} onImageClick={onImageClick} />);
  const imgs = screen.getAllByRole('img');
  fireEvent.click(imgs[1]);
  expect(onImageClick).toHaveBeenCalledWith(1);
});

test('does not throw when onImageClick is not provided', () => {
  render(<MasonryGallery images={images} />);
  expect(() => fireEvent.click(screen.getAllByRole('img')[0])).not.toThrow();
});
