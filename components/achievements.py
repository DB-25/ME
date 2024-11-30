import streamlit as st
import os
from data.achievements import get_achievements

def render_achievement(achievement):
    # Display the emoji and title
    if 'links' in achievement and len(achievement['links']) > 0:
        primary_link = achievement['links'][0]['url']
        st.markdown(
            f"**{achievement['emoji']} [{achievement['title']}]({primary_link})**",
            unsafe_allow_html=False
        )
    else:
        st.markdown(
            f"**{achievement['emoji']} {achievement['title']}**",
            unsafe_allow_html=False
        )

    # Display the institution if available
    if achievement.get('institution'):
        st.markdown(f"*{achievement['institution']}*")

    # Display the description
    st.write(achievement['description'])

    # Display additional links if any
    if 'links' in achievement and len(achievement['links']) > 1:
        for link in achievement['links'][1:]:
            st.markdown(f"- [{link['label']}]({link['url']})")

    # Display image carousel if images are present
    if 'images' in achievement and len(achievement['images']) > 0:
        image_tabs = st.tabs([f"Image {i + 1}" for i in range(len(achievement['images']))])
        for i, image_path in enumerate(achievement['images']):
            with image_tabs[i]:
                if os.path.exists(image_path):
                    st.image(image_path, use_column_width=True)
                else:
                    st.warning(f"Image not found: {image_path}")

    # Add a horizontal divider between achievements
    st.markdown("---")

def render():
    achievements = get_achievements()
    for achievement in achievements:
        render_achievement(achievement) 