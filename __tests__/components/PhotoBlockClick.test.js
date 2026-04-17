import { render, screen, fireEvent } from '@testing-library/react';
import PhotoBlock from '../../components/image-displays/gallery/photo-block/PhotoBlock';

jest.mock('../../common/imageUtils', () => ({ getSizedUrl: (url) => url }));

test('calls onImageClick(0) when image is clicked (variant 1)', () => {
  const onImageClick = jest.fn();
  render(<PhotoBlock imageUrl="https://example.com/photo.jpg" variant={1} onImageClick={onImageClick} />);
  fireEvent.click(screen.getByRole('img'));
  expect(onImageClick).toHaveBeenCalledWith(0);
});

test('calls onImageClick(0) when image is clicked (variant 2)', () => {
  const onImageClick = jest.fn();
  render(<PhotoBlock imageUrl="https://example.com/photo.jpg" variant={2} onImageClick={onImageClick} />);
  fireEvent.click(screen.getByRole('img'));
  expect(onImageClick).toHaveBeenCalledWith(0);
});

test('does not throw when onImageClick is not provided', () => {
  jest.mock('../../common/imageUtils', () => ({ getSizedUrl: (url) => url }));
  render(<PhotoBlock imageUrl="https://example.com/photo.jpg" variant={1} />);
  expect(() => fireEvent.click(screen.getByRole('img'))).not.toThrow();
});
