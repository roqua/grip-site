/**
 * Block components made available to every MDX page without an import.
 * Passed to <Content components={...} /> by the page routes.
 */
import Hero from './blocks/Hero.astro';
import PageHeader from './blocks/PageHeader.astro';
import HeaderImage from './blocks/HeaderImage.astro';
import Lined from './blocks/Lined.astro';
import LineButton from './blocks/LineButton.astro';
import LineEnding from './blocks/LineEnding.astro';
import Columns from './blocks/Columns.astro';
import Banner from './blocks/Banner.astro';
import Card from './blocks/Card.astro';
import TextBlock from './blocks/TextBlock.astro';
import TextColumns from './blocks/TextColumns.astro';
import People from './blocks/People.astro';
import NewsGrid from './blocks/NewsGrid.astro';
import NewsText from './blocks/NewsText.astro';
import Button from './blocks/Button.astro';

export const blocks = {
  Hero,
  PageHeader,
  HeaderImage,
  Lined,
  LineButton,
  LineEnding,
  Columns,
  Banner,
  Card,
  TextBlock,
  TextColumns,
  People,
  NewsGrid,
  NewsText,
  Button,
};
